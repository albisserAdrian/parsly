from bullmq import Worker
from docling.document_converter import DocumentConverter
import boto3
import asyncio
import signal
import os
from pathlib import Path
import tempfile
import requests
from dotenv import load_dotenv

load_dotenv()

# Initialize default converter
converter = DocumentConverter()

s3_client = boto3.client(
    "s3",
    endpoint_url=os.getenv("S3_ENDPOINT", "http://localhost:9000"),
    aws_access_key_id=os.getenv("S3_ACCESS_KEY", "minioadmin"),
    aws_secret_access_key=os.getenv("S3_SECRET_KEY", "minioadmin"),
    region_name=os.getenv("AWS_REGION", "us-east-1"),
)
bucket = os.getenv("S3_BUCKET", "parsly")


def get_converter(ocr_engine: str):
    """Get configured DocumentConverter based on OCR engine
    TODO: Configure OCR options based on docling version API
    """
    # For now, return default converter
    return converter


async def process(job):
    """Process document conversion job"""
    job_id = job.id
    data = job.data

    print(f"Processing job {job_id}: {data.get('jobType', 'unknown')}")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download input
            input_path = Path(temp_dir) / "input"

            if data.get("source"):  # URL source
                print(f"Downloading from URL: {data['source']}")
                response = requests.get(data["source"])
                response.raise_for_status()
                with open(input_path, "wb") as f:
                    f.write(response.content)
            elif data.get("fileName"):  # S3/MinIO source
                print(f"Downloading from S3: {data['fileName']}")
                s3_client.download_file(bucket, data["fileName"], str(input_path))

            # Get appropriate converter
            ocr_engine = data.get("ocrEngine", "easyocr")
            converter = get_converter(ocr_engine)

            # Convert document
            print(f"Converting document with {ocr_engine}...")
            result = converter.convert(str(input_path))

            # Generate all requested formats
            formats = {}
            output_formats = data.get("outputFormats", ["md_content"])

            for fmt in output_formats:
                if fmt == "md_content":
                    formats["md_content"] = result.document.export_to_markdown()
                elif fmt == "json_content":
                    formats["json_content"] = result.document.export_to_dict()
                elif fmt == "doctags_content":
                    formats["doctags_content"] = str(
                        result.document.export_to_doctags()
                    )
                elif fmt == "html_content":
                    # Note: export_to_html may vary by docling version
                    formats["html_content"] = result.document.export_to_html()

            # Return complete result (will be stored in Redis by BullMQ)
            return {
                "jobId": job_id,
                "status": "completed",
                "formats": formats,
                "metadata": {
                    "pages": len(result.document.pages)
                    if hasattr(result.document, "pages")
                    else 0,
                    "processingTime": 0,  # TODO: Add timing
                },
            }

    except Exception as e:
        print(f"Error processing job {job_id}: {str(e)}")
        return {
            "jobId": job_id,
            "status": "failed",
            "metadata": {"error": str(e)},
        }


async def main():
    # Create an event that will be triggered for shutdown
    shutdown_event = asyncio.Event()

    def signal_handler(sig, frame):
        shutdown_event.set()

    # Assign signal handlers to SIGTERM and SIGINT
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    queue_name = os.getenv("QUEUE_NAME", "docling-parse")
    concurrency = int(os.getenv("WORKER_CONCURRENCY", "2"))

    worker = Worker(
        queue_name,
        process,  # type: ignore
        {
            "connection": {
                "host": os.getenv("REDIS_HOST", "localhost"),
                "port": int(os.getenv("REDIS_PORT", "6379")),
            },
            "concurrency": concurrency,
        },
    )

    print(f"Docling Worker started (queue: {queue_name}, concurrency: {concurrency})")

    # Wait until the shutdown event is set
    await shutdown_event.wait()

    # close the worker
    print("Cleaning up worker...")
    await worker.close()
    print("Worker shut down successfully.")


if __name__ == "__main__":
    asyncio.run(main())

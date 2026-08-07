import queue
import threading
import time
from typing import Callable, Tuple

class QueueManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super(QueueManager, cls).__new__(cls)
                cls._instance._init_queue()
            return cls._instance
            
    def _init_queue(self):
        self.task_queue = queue.Queue()
        self.worker_thread = None
        self.running = False
        
    def start_worker(self):
        """Starts the background worker thread if not already running."""
        with self._lock:
            if not self.running:
                self.running = True
                self.worker_thread = threading.Thread(
                    target=self._process_queue, 
                    daemon=True, 
                    name="ffmpeg-queue-worker"
                )
                self.worker_thread.start()
                
    def add_task(self, task_id: str, run_fn: Callable[[], None]):
        """Enqueues a task for sequential background execution."""
        self.task_queue.put((task_id, run_fn))
        self.start_worker()
        
    def _process_queue(self):
        """Worker loop that executes queued tasks sequentially."""
        while self.running:
            try:
                # Poll queue every 1s
                task_id, run_fn = self.task_queue.get(timeout=1.0)
            except queue.Empty:
                continue
                
            try:
                # Run the task
                run_fn()
            except Exception as e:
                print(f"[QueueManager] Error running task {task_id}: {e}")
            finally:
                self.task_queue.task_done()
                
    def stop_worker(self):
        """Stops the worker thread execution loop."""
        self.running = False
        if self.worker_thread:
            self.worker_thread.join(timeout=2.0)
            self.worker_thread = None

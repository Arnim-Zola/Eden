import os
import sys
import django
import traceback
from django.core.wsgi import get_wsgi_application
from django.urls import resolve

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
application = get_wsgi_application()

print("WSGI Application loaded!")

try:
    resolve('/')
except Exception as e:
    print("Resolve '/' resulted in exception:")
    traceback.print_exc()

print("Loaded modules count after URL resolution:", len(sys.modules))

# Check if heavy modules are loaded
heavy_modules = ['torch', 'torchvision', 'easyocr', 'whisper', 'sympy', 'scipy', 'numpy', 'cv2']
for mod in heavy_modules:
    is_loaded = mod in sys.modules
    print(f"Is '{mod}' loaded? {is_loaded}")

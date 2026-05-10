from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalysisJobViewSet, UploadView

router = DefaultRouter()
router.register(r'jobs', AnalysisJobViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('upload/', UploadView.as_view()),
]

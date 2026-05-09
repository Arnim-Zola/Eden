from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalysisJobViewSet

router = DefaultRouter()
router.register(r'jobs', AnalysisJobViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

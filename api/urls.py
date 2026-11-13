from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'teams', views.TeamViewSet)
router.register(r'players', views.PlayerViewSet)
router.register(r'games', views.GameViewSet)
router.register(r'at-bats', views.AtBatRecordViewSet)
router.register(r'pitches', views.PitchRecordViewSet)
# ↓ ここから下を追加
router.register(r'excel-batting', views.GameBattingResultViewSet)
router.register(r'excel-pitching', views.GamePitchingResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
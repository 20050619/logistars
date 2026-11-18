from rest_framework import serializers
from .models import (
    Team, Player, AppUser, Game, AtBatRecord, PitchRecord, 
    GameBattingResult, GamePitchingResult, PhysicalRecord
)

class TeamSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Team
        fields = '__all__'

class PlayerSerializer(serializers.ModelSerializer):
    retirementDate = serializers.DateField(source='retirement_date', required=False, allow_null=True)

    class Meta: 
        model = Player
        fields = '__all__'

class AppUserSerializer(serializers.ModelSerializer):
    linkedPlayerId = serializers.PrimaryKeyRelatedField(
        source='linked_player', queryset=Player.objects.all(), required=False, allow_null=True
    )
    isActive = serializers.BooleanField(source='is_active', default=True)
    mustChangePassword = serializers.BooleanField(source='must_change_password', default=True)

    class Meta:
        model = AppUser
        fields = ['id', 'username', 'email', 'password', 'role', 'linkedPlayerId', 'isActive', 'mustChangePassword']

class GameSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Game
        fields = '__all__'

class AtBatRecordSerializer(serializers.ModelSerializer):
    class Meta: 
        model = AtBatRecord
        fields = '__all__'

class PitchRecordSerializer(serializers.ModelSerializer):
    class Meta: 
        model = PitchRecord
        fields = '__all__'

class GameBattingResultSerializer(serializers.ModelSerializer):
    class Meta: 
        model = GameBattingResult
        fields = '__all__'

class GamePitchingResultSerializer(serializers.ModelSerializer):
    class Meta: 
        model = GamePitchingResult
        fields = '__all__'

class PhysicalRecordSerializer(serializers.ModelSerializer):
    playerId = serializers.PrimaryKeyRelatedField(source='player', queryset=Player.objects.all())

    class Meta:
        model = PhysicalRecord
        fields = ['id', 'playerId', 'date', 'measurer', 'memo', 'measurements']
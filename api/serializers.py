from rest_framework import serializers
from .models import Team, Player, Game, AtBatRecord, PitchRecord, GameBattingResult, GamePitchingResult

class TeamSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Team
        fields = '__all__'

class PlayerSerializer(serializers.ModelSerializer):
    # ★ ここを追加：React側の retirementDate と Django側の retirement_date を自動で結びつける
    retirementDate = serializers.DateField(source='retirement_date', required=False, allow_null=True)

    class Meta: 
        model = Player
        fields = '__all__'

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
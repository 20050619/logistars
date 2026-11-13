from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import pandas as pd

from .models import Team, Player, Game, AtBatRecord, PitchRecord, GameBattingResult, GamePitchingResult
from .serializers import (
    TeamSerializer, PlayerSerializer, GameSerializer, 
    AtBatRecordSerializer, PitchRecordSerializer, 
    GameBattingResultSerializer, GamePitchingResultSerializer
)

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer

class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer

    @action(detail=True, methods=['post'], url_path='upload-excel')
    def upload_excel(self, request, pk=None):
        game = self.get_object()
        excel_file = request.FILES.get('file')
        upload_type = request.POST.get('type')

        if not excel_file:
            return Response({'error': 'ファイルが選択されていません'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(excel_file)
            df.columns = df.columns.str.strip() # 列名の空白や改行を除去
            df = df.fillna(0)
            
            # デモ環境等でteamが一致しない場合も考慮し、全選手から検索可能に
            players = list(Player.objects.filter(team=game.team))
            if not players:
                players = list(Player.objects.all())
                
            success_count = 0

            # ★最強の選手特定ロジック（背番号・名前）
            def find_player(row):
                p_num = row.get('背番号')
                if pd.notna(p_num) and str(p_num).strip() != '' and str(p_num).strip() != '0':
                    try:
                        num_str = str(int(float(p_num)))
                        for p in players:
                            if str(p.number) == num_str: return p
                    except Exception: pass
                
                p_name = str(row.get('選手名', '')).replace(' ', '').replace(' ', '')
                if p_name:
                    for p in players:
                        if p.name and p.name.replace(' ', '').replace(' ', '') == p_name: return p
                return None

            if upload_type == 'batting':
                for index, row in df.iterrows():
                    player = find_player(row)
                    if not player: continue
                    
                    GameBattingResult.objects.update_or_create(
                        game=game, player=player,
                        defaults={
                            'batting_order': str(row.get('打順', '')),
                            'position': str(row.get('位置', '')),
                            'plate_appearances': int(row.get('打席', 0)),
                            'at_bats': int(row.get('打数', 0)),
                            'runs': int(row.get('得点', 0)),
                            'hits': int(row.get('安打', 0)),
                            'doubles': int(row.get('二塁打', 0)),
                            'triples': int(row.get('三塁打', 0)),
                            'home_runs': int(row.get('本塁打', 0)),
                            'rbi': int(row.get('打点', 0)),
                            'steals': int(row.get('盗塁', 0)),
                            'steal_caught': int(row.get('盗刺', 0)),
                            'sacrifice_bunts': int(row.get('犠打', 0)),
                            'sacrifice_flies': int(row.get('犠飛', 0)),
                            'walks': int(row.get('四球', 0)),
                            'hit_by_pitch': int(row.get('死球', 0)),
                            'strikeouts': int(row.get('三振', 0)),
                            'double_plays': int(row.get('併殺打', 0)),
                            'errors': int(row.get('失策', 0)),
                            'total_bases': int(row.get('塁打数', 0)),
                        }
                    )
                    success_count += 1

            elif upload_type == 'pitching':
                for index, row in df.iterrows():
                    player = find_player(row)
                    if not player: continue
                    
                    GamePitchingResult.objects.update_or_create(
                        game=game, player=player,
                        defaults={
                            'games_played': int(row.get('試合', 0) or row.get('登板', 0)),
                            'appearances': int(row.get('登板', 0)),
                            'innings_pitched': float(row.get('イニング', 0) or row.get('投球回', 0)),
                            'outs': int(row.get('アウト', 0)),
                            'sacrifice_outs': int(row.get('犠アウト', 0)),
                            'ground_outs': int(row.get('ゴロo', 0)),
                            'fly_outs': int(row.get('フライo', 0)),
                            'strikeouts_right': int(row.get('奪三振右', 0) or row.get('奪三振(右)', 0)),
                            'strikeouts_left': int(row.get('奪三振左', 0) or row.get('奪三振(左)', 0)),
                            'other_outs': int(row.get('その他o', 0)),
                            'batters_faced_right': int(row.get('打席右', 0)),
                            'batters_faced_left': int(row.get('打席左', 0)),
                            'at_bats_right': int(row.get('打数右', 0)),
                            'at_bats_left': int(row.get('打数左', 0)),
                            'hits_allowed_right': int(row.get('被安打右', 0) or row.get('被安打(右)', 0)),
                            'hits_allowed_left': int(row.get('被安打左', 0) or row.get('被安打(左)', 0)),
                            'home_runs_allowed': int(row.get('被本塁打', 0)),
                            'walks_allowed_right': int(row.get('与四球右', 0)),
                            'walks_allowed_left': int(row.get('与四球左', 0)),
                            'hit_batters_right': int(row.get('与死球右', 0)),
                            'hit_batters_left': int(row.get('与死球左', 0)),
                            'wild_pitches': int(row.get('暴投', 0)),
                            'balks': int(row.get('ボーク', 0)),
                            'runs_allowed': int(row.get('失点', 0)),
                            'earned_runs': int(row.get('自責点', 0)),
                            'wins': int(row.get('勝ち', 0)),
                            'losses': int(row.get('負け', 0)),
                            'saves': int(row.get('セーブ', 0)),
                            'holds': int(row.get('ホールド', 0)),
                            'starts': int(row.get('先発', 0)),
                            'first_pitch_strikes': int(row.get('初球S', 0)),
                            'pitch_count': int(row.get('投球数', 0)),
                        }
                    )
                    success_count += 1
            else:
                return Response({'error': '不正な取込タイプです'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({'message': f'{success_count}名の選手データを一括登録しました！'}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': f'取込エラー: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AtBatRecordViewSet(viewsets.ModelViewSet):
    queryset = AtBatRecord.objects.all()
    serializer_class = AtBatRecordSerializer

class PitchRecordViewSet(viewsets.ModelViewSet):
    queryset = PitchRecord.objects.all()
    serializer_class = PitchRecordSerializer

class GameBattingResultViewSet(viewsets.ModelViewSet):
    queryset = GameBattingResult.objects.all()
    serializer_class = GameBattingResultSerializer

class GamePitchingResultViewSet(viewsets.ModelViewSet):
    queryset = GamePitchingResult.objects.all()
    serializer_class = GamePitchingResultSerializer
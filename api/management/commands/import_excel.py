import pandas as pd
from django.core.management.base import BaseCommand
from api.models import Player, Game, GameBattingResult

class Command(BaseCommand):
    help = '試合別の打撃成績Excelを取り込むコマンド'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='取り込むExcelファイルのパス')

    def handle(self, *args, **kwargs):
        file_path = kwargs['file_path']
        self.stdout.write(f"ファイル {file_path} の読み込みを開始します...")

        try:
            # Excelを読み込む（空白のセルは 0 として扱う設定）
            df = pd.read_excel(file_path)
            df = df.fillna(0)
            
            count = 0
            for index, row in df.iterrows():
                # 1. 試合データの取得・作成 (無ければ自動登録)
                game_date = pd.to_datetime(row['日付']).date()
                opponent = str(row['対戦相手']).strip()
                notes = str(row['備考']).strip() if '備考' in row and row['備考'] != 0 else ""
                
                game, created = Game.objects.get_or_create(
                    date=game_date,
                    opponent=opponent,
                    defaults={'notes': notes}
                )

                # 2. 選手データの取得・作成 (無ければ自動登録)
                player_name = str(row['選手名']).strip()
                if not player_name or player_name == '0':
                    continue # 選手名が空欄の場合はスキップ
                    
                player, created = Player.objects.get_or_create(
                    name=player_name
                )

                # 3. 試合別打撃成績の登録（同じデータがあれば上書き更新）
                GameBattingResult.objects.update_or_create(
                    game=game,
                    player=player,
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
                        'runs_batted_in': int(row.get('打点', 0)),
                        'stolen_bases': int(row.get('盗塁', 0)),
                        'caught_stealing': int(row.get('盗刺', 0)),
                        'sacrifice_hits': int(row.get('犠打', 0)),
                        'sacrifice_flies': int(row.get('犠飛', 0)),
                        'walks': int(row.get('四球', 0)),
                        'hit_by_pitch': int(row.get('死球', 0)),
                        'strikeouts': int(row.get('三振', 0)),
                        'double_plays': int(row.get('併殺打', 0)),
                        'errors': int(row.get('失策', 0)),
                        'total_bases': int(row.get('塁打数', 0)),
                    }
                )
                count += 1

            self.stdout.write(self.style.SUCCESS(f"成功: {count} 件の打撃成績データを取り込みました！"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"エラーが発生しました: {e}"))
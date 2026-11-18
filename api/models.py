from django.db import models

# 1. チーム（テナント）マスタ
class Team(models.Model):
    name = models.CharField("チーム名", max_length=100)
    logo = models.TextField("チームロゴ(Base64)", null=True, blank=True)
    season_start_month = models.IntegerField("年度開始月", default=4)
    season_start_day = models.IntegerField("年度開始日", default=1)
    season_end_month = models.IntegerField("年度終了月", default=3)
    season_end_day = models.IntegerField("年度終了日", default=31)
    include_retired_stats = models.BooleanField("退団者成績反映", default=False)
    created_at = models.DateTimeField("登録日時", auto_now_add=True)

    class Meta:
        verbose_name = "チーム"
        verbose_name_plural = "チーム一覧"

    def __str__(self):
        return self.name

# 2. 選手マスタ
class Player(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='players', null=True, blank=True)
    number = models.IntegerField("背番号", null=True, blank=True)
    name = models.CharField("選手名", max_length=50)
    
    birth_date = models.DateField("生年月日", null=True, blank=True)
    height = models.IntegerField("身長(cm)", null=True, blank=True)
    weight = models.FloatField("体重(kg)", null=True, blank=True)
    
    position = models.CharField("ポジション", max_length=20, null=True, blank=True)
    batting_hand = models.CharField("投打", max_length=20, null=True, blank=True)
    retirement_date = models.DateField("退団日", null=True, blank=True)
    photo = models.TextField("顔写真(Base64)", null=True, blank=True)
    is_active = models.BooleanField("在籍状態", default=True)

    class Meta:
        verbose_name = "選手"
        verbose_name_plural = "選手一覧"

    def __str__(self):
        return self.name

# 2.5 アプリ利用者アカウント（完全DB認証用）
class AppUser(models.Model):
    username = models.CharField("ユーザーID", max_length=50, unique=True)
    email = models.CharField("メールアドレス", max_length=100, null=True, blank=True)
    password = models.CharField("パスワード", max_length=100)
    role = models.CharField("権限", max_length=20, default="player") # admin, executive, player
    linked_player = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField("ログイン許可", default=True)
    must_change_password = models.BooleanField("初期パスワード変更必須", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "アプリアカウント"
        verbose_name_plural = "アプリアカウント一覧"

    def __str__(self):
        return self.username

# 3. 試合・スケジュールデータ
class Game(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='games', null=True, blank=True)
    date = models.DateField("日付")
    opponent = models.CharField("対戦相手", max_length=100)
    game_type = models.CharField("試合種別", max_length=50, default="公式戦")
    location = models.CharField("場所", max_length=100, null=True, blank=True)
    status = models.CharField("ステータス", max_length=20, default="予定")
    my_score = models.IntegerField("自チーム得点", null=True, blank=True)
    op_score = models.IntegerField("相手チーム得点", null=True, blank=True)
    notes = models.CharField("備考", max_length=100, null=True, blank=True)
    line_score = models.JSONField("スコアボード", default=dict, blank=True, null=True)

    class Meta:
        verbose_name = "試合"
        verbose_name_plural = "試合一覧"

    def __str__(self):
        return f"{self.date} vs {self.opponent}"

# 4. 成績データ（1打席ごとの記録 / スマホUI・打撃用連動）
class AtBatRecord(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='at_bats')
    batter = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='batting_records')
    inning = models.CharField("イニング", max_length=10, null=True, blank=True)
    batting_order = models.CharField("打席数", max_length=20, null=True, blank=True)
    outs = models.CharField("アウトカウント", max_length=10, null=True, blank=True)
    runner_state = models.CharField("ランナー状況", max_length=50, null=True, blank=True)
    balls = models.IntegerField("ボール", default=0)
    strikes = models.IntegerField("ストライク", default=0)
    pitch_type = models.CharField("球種", max_length=50, null=True, blank=True)
    course = models.CharField("コース", max_length=20, null=True, blank=True)
    result = models.CharField("打席結果", max_length=50)
    direction = models.CharField("打球方向", max_length=50, null=True, blank=True)
    remarks = models.CharField("備考", max_length=200, null=True, blank=True)
    rbi = models.IntegerField("打点", default=0)
    raw_data = models.JSONField("画面復元用生データ", default=dict, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "打撃記録 (1打席)"
        verbose_name_plural = "打撃記録一覧"

    def __str__(self):
        return f"{self.game.date} - {self.batter.name} ({self.result})"

# 5. 成績データ（1球ごとの投球記録 / スマホUI・投手用連動）
class PitchRecord(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='pitches')
    pitcher = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='pitching_records')
    inning = models.CharField("イニング", max_length=10, null=True, blank=True)
    batter_name = models.CharField("打者名", max_length=50, null=True, blank=True)
    outs = models.CharField("アウトカウント", max_length=10, null=True, blank=True)
    runner_state = models.CharField("ランナー状況", max_length=50, null=True, blank=True)
    balls = models.IntegerField("ボール", default=0)
    strikes = models.IntegerField("ストライク", default=0)
    pitch_count = models.IntegerField("球数", null=True, blank=True)
    pitch_type = models.CharField("球種", max_length=50, null=True, blank=True)
    course = models.CharField("コース", max_length=20, null=True, blank=True)
    speed = models.IntegerField("球速(km/h)", null=True, blank=True)
    result = models.CharField("投球結果", max_length=50)
    direction = models.CharField("打球方向", max_length=50, null=True, blank=True)
    remarks = models.CharField("備考", max_length=200, null=True, blank=True)
    raw_data = models.JSONField("画面復元用生データ", default=dict, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "投球記録 (1球)"
        verbose_name_plural = "投球記録一覧"

    def __str__(self):
        return f"{self.game.date} - {self.pitcher.name} ({self.result})"

# 6. Excel取込用：打撃成績（1試合の合計）
class GameBattingResult(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='excel_batting_results')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='excel_batting_results')
    batting_order = models.CharField("打順", max_length=10, null=True, blank=True)
    position = models.CharField("位置", max_length=20, null=True, blank=True)
    plate_appearances = models.IntegerField("打席", default=0)
    at_bats = models.IntegerField("打数", default=0)
    runs = models.IntegerField("得点", default=0)
    hits = models.IntegerField("安打", default=0)
    doubles = models.IntegerField("二塁打", default=0)
    triples = models.IntegerField("三塁打", default=0)
    home_runs = models.IntegerField("本塁打", default=0)
    rbi = models.IntegerField("打点", default=0)
    steals = models.IntegerField("盗塁", default=0)
    steal_caught = models.IntegerField("盗刺", default=0)
    sacrifice_bunts = models.IntegerField("犠打", default=0)
    sacrifice_flies = models.IntegerField("犠飛", default=0)
    walks = models.IntegerField("四球", default=0)
    hit_by_pitch = models.IntegerField("死球", default=0)
    strikeouts = models.IntegerField("三振", default=0)
    double_plays = models.IntegerField("併殺打", default=0)
    errors = models.IntegerField("失策", default=0)
    total_bases = models.IntegerField("塁打数", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Excel打撃成績"
        verbose_name_plural = "Excel打撃成績一覧"

    def __str__(self):
        return f"{self.game.date} - {self.player.name} (打撃)"

# 7. Excel取込用：投手成績（1試合の合計）
class GamePitchingResult(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='excel_pitching_results')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='excel_pitching_results')
    games_played = models.IntegerField("試合", default=0)
    appearances = models.IntegerField("登板", default=0)
    innings_pitched = models.FloatField("イニング", default=0.0)
    outs = models.IntegerField("アウト", default=0)
    sacrifice_outs = models.IntegerField("犠アウト", default=0)
    ground_outs = models.IntegerField("ゴロo", default=0)
    fly_outs = models.IntegerField("フライo", default=0)
    strikeouts_right = models.IntegerField("奪三振右", default=0)
    strikeouts_left = models.IntegerField("奪三振左", default=0)
    other_outs = models.IntegerField("その他o", default=0)
    batters_faced_right = models.IntegerField("打席右", default=0)
    batters_faced_left = models.IntegerField("打席左", default=0)
    at_bats_right = models.IntegerField("打数右", default=0)
    at_bats_left = models.IntegerField("打数左", default=0)
    hits_allowed_right = models.IntegerField("被安打右", default=0)
    hits_allowed_left = models.IntegerField("被安打左", default=0)
    home_runs_allowed = models.IntegerField("被本塁打", default=0)
    walks_allowed_right = models.IntegerField("与四球右", default=0)
    walks_allowed_left = models.IntegerField("与四球左", default=0)
    hit_batters_right = models.IntegerField("与死球右", default=0)
    hit_batters_left = models.IntegerField("与死球左", default=0)
    wild_pitches = models.IntegerField("暴投", default=0)
    balks = models.IntegerField("ボーク", default=0)
    runs_allowed = models.IntegerField("失点", default=0)
    earned_runs = models.IntegerField("自責点", default=0)
    wins = models.IntegerField("勝ち", default=0)
    losses = models.IntegerField("負け", default=0)
    saves = models.IntegerField("セーブ", default=0)
    holds = models.IntegerField("ホールド", default=0)
    starts = models.IntegerField("先発", default=0)
    first_pitch_strikes = models.IntegerField("初球S", default=0)
    pitch_count = models.IntegerField("投球数", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Excel投手成績"
        verbose_name_plural = "Excel投手成績一覧"

    def __str__(self):
        return f"{self.game.date} - {self.player.name} (投手)"

# 8. 身体能力測定データ
class PhysicalRecord(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='physical_records')
    date = models.DateField("測定日")
    measurer = models.CharField("測定者", max_length=50, null=True, blank=True)
    memo = models.TextField("過去のケガ・備考", null=True, blank=True)
    measurements = models.JSONField("測定項目データ", default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "身体能力記録"
        verbose_name_plural = "身体能力記録一覧"

    def __str__(self):
        return f"{self.date} - {self.player.name}"
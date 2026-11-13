from django.contrib import admin
from .models import Team, Player, Game, AtBatRecord, PitchRecord

# 管理画面（Admin）に新しいテーブルを登録します
admin.site.register(Team)
admin.site.register(Player)
admin.site.register(Game)
admin.site.register(AtBatRecord)
admin.site.register(PitchRecord)
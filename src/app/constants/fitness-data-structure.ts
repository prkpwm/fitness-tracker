export const FITNESS_DATA_STRUCTURE = `# Fitness Data API Schema

## Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | string | ✓ | Entry date (YYYY-MM-DD) |
| last_update | string | | Last modification time (YYYY-MM-DD HH:mm:ss) |
| user_profile | object | ✓ | User profile information |
| food_diary | array | ✓ | Food entries (can be empty) |
| exercise_summary | object | ✓ | Exercise data |
| daily_total_stats | object | ✓ | Daily totals |
| ai_evaluation | object | | AI analysis results |

## user_profile

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| age | number | | User age |
| weight_kg | number | ✓ | Weight in kilograms |
| height_cm | number | ✓ | Height in centimeters |
| goal_calories | number | ✓ | Daily calorie target |
| maintenance_protein_target_g | number | ✓ | Protein target in grams |
| recommended_daily_calories | number | ✓ | Recommended daily intake |
| min_weight_loss_calories | number | ✓ | Minimum calories for weight loss |
| max_weight_loss_calories | number | ✓| Maximum calories for weight loss |

## food_diary[]

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| time | string | | Meal time (เช้า/กลางวัน/เย็น/ดึก) |
| item | string | ✓ | Food description |
| calories | number | ✓ | Calories per serving |
| protein_g | number | ✓ | Protein in grams |
| carbs_g | number | ✓ | Carbohydrates in grams |
| fat_g | number | ✓ | Fat in grams |

## exercise_summary

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cardio_session_X | object | | Cardio sessions (X = 1,2,3...) |
| strength_training | object | | Strength training session |
| total_burned_calories | number | ✓ | Total exercise calories |

### cardio_session_X

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | ✓ | Exercise type |
| duration_min | number | ✓ | Duration in minutes |
| distance_mi | number | ✓ | Distance in miles |
| calories_burned | number | ✓ | Calories burned |
| avg_hr_bpm | number | | Average heart rate |

### strength_training

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | ✓ | Training type |
| target | string | ✓ | Target muscle groups |
| duration_min | number | ✓ | Duration in minutes |
| calories_burned | number | ✓ | Calories burned |

## daily_total_stats

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| total_intake_calories | number | ✓ | Total food calories |
| total_burned_calories | number | ✓ | Total exercise calories |
| net_calories | number | ✓ | Intake minus burned |
| total_protein_g | number | ✓ | Total protein consumed |
| total_carbs_g | number | ✓ | Total carbs consumed |
| total_fat_g | number | ✓ | Total fat consumed |
| protein_per_kg | number | ✓ | Protein per kg body weight |

## ai_evaluation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| muscle_maintenance | string | ✓ | Protein adequacy status |
| weight_loss_status | string | ✓ | Calorie deficit status |
| recommendation | string | ✓ | AI advice and feedback |`;
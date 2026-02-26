################################################################################
# SSM Parameters — Application Secrets
################################################################################

resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project_name}/${var.environment}/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://atena:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/atena"

  tags = { Name = "${local.name_prefix}-database-url" }
}

resource "aws_ssm_parameter" "redis_url" {
  name  = "/${var.project_name}/${var.environment}/REDIS_URL"
  type  = "SecureString"
  value = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379"

  tags = { Name = "${local.name_prefix}-redis-url" }
}

resource "aws_ssm_parameter" "claude_api_key" {
  name  = "/${var.project_name}/${var.environment}/CLAUDE_API_KEY"
  type  = "SecureString"
  value = "CHANGE_ME"

  lifecycle {
    ignore_changes = [value]
  }

  tags = { Name = "${local.name_prefix}-claude-api-key" }
}

resource "aws_ssm_parameter" "admin_token" {
  name  = "/${var.project_name}/${var.environment}/ADMIN_TOKEN"
  type  = "SecureString"
  value = "CHANGE_ME"

  lifecycle {
    ignore_changes = [value]
  }

  tags = { Name = "${local.name_prefix}-admin-token" }
}

resource "aws_ssm_parameter" "telegram_bot_token" {
  name  = "/${var.project_name}/${var.environment}/TELEGRAM_BOT_TOKEN"
  type  = "SecureString"
  value = "CHANGE_ME"

  lifecycle {
    ignore_changes = [value]
  }

  tags = { Name = "${local.name_prefix}-telegram-bot-token" }
}

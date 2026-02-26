locals {
  name_prefix = "${var.project_name}-${var.environment}"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.20.0/24"]

  has_domain = var.domain_name != ""

  api_environment = [
    { name = "PORT", value = "3000" },
    { name = "HOST", value = "0.0.0.0" },
    { name = "NODE_ENV", value = "production" },
    { name = "LOG_LEVEL", value = "info" },
  ]

  app_secrets = [
    { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.database_url.arn },
    { name = "REDIS_URL", valueFrom = aws_ssm_parameter.redis_url.arn },
    { name = "CLAUDE_API_KEY", valueFrom = aws_ssm_parameter.claude_api_key.arn },
    { name = "ADMIN_TOKEN", valueFrom = aws_ssm_parameter.admin_token.arn },
    { name = "TELEGRAM_BOT_TOKEN", valueFrom = aws_ssm_parameter.telegram_bot_token.arn },
  ]
}

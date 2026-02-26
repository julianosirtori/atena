################################################################################
# CloudWatch Log Groups
################################################################################

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name_prefix}-api"
  retention_in_days = 30

  tags = { Name = "${local.name_prefix}-api-logs" }
}

resource "aws_cloudwatch_log_group" "workers" {
  name              = "/ecs/${local.name_prefix}-workers"
  retention_in_days = 30

  tags = { Name = "${local.name_prefix}-workers-logs" }
}

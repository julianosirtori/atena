################################################################################
# Application Load Balancer
################################################################################

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "${local.name_prefix}-alb" }
}

################################################################################
# Target Group
################################################################################

resource "aws_lb_target_group" "api" {
  name        = "${local.name_prefix}-api-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${local.name_prefix}-api-tg" }
}

################################################################################
# HTTP Listener — redirect to HTTPS if domain, otherwise forward
################################################################################

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = local.has_domain ? "redirect" : "forward"

    dynamic "redirect" {
      for_each = local.has_domain ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    target_group_arn = local.has_domain ? null : aws_lb_target_group.api.arn
  }
}

################################################################################
# HTTPS Listener (conditional — only when domain is configured)
################################################################################

resource "aws_lb_listener" "https" {
  count = local.has_domain ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

################################################################################
# ACM Certificate (conditional)
################################################################################

resource "aws_acm_certificate" "main" {
  count = local.has_domain ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name_prefix}-cert" }
}

resource "aws_acm_certificate_validation" "main" {
  count = local.has_domain ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

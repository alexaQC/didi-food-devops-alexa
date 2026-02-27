output "namespace" {
  value = kubernetes_namespace.finlab.metadata[0].name
}

output "helm_release_status" {
  value = helm_release.finlab.status
}
{{/*
Expand the name of the chart.
*/}}
{{- define "keystone-ui.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.

Uses the standard Helm pattern: release name when it already contains the
chart name (e.g. `keystone-ui-pr-71`), otherwise `<release>-<chart>`. This
is critical for the per-PR preview deploys — multiple releases
(`keystone-ui-pr-71`, `keystone-ui-pr-72`, …) live in the same namespace
and would collide on Deployment / Service / ConfigMap names if fullname
ignored .Release.Name.
*/}}
{{- define "keystone-ui.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "keystone-ui.labels" -}}
helm.sh/chart: {{ include "keystone-ui.name" . }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "keystone-ui.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "keystone-ui.selectorLabels" -}}
app.kubernetes.io/name: {{ include "keystone-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
ServiceAccount name
*/}}
{{- define "keystone-ui.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "keystone-ui.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

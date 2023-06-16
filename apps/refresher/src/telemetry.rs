use base64::{
    alphabet,
    engine::{self, general_purpose},
    Engine as _,
};
use opentelemetry::{
    global,
    KeyValue,
    sdk::{propagation::TraceContextPropagator, Resource, trace},
};
use opentelemetry_otlp::WithExportConfig;
use pyroscope::PyroscopeAgent;
use pyroscope_pprofrs::{pprof_backend, PprofConfig};
use std::env;
use tonic::metadata::{MetadataMap, MetadataValue};
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};
use url::Url;

pub fn setup() {
    let app_name = "refresher";

    let telemetry_agent;

    let telemetry_key = env::var("TELEMETRY_KEY").expect("$TELEMETRY_KEY is not set");
    let exec_env = env::var("EXEC_ENV").expect("$EXEC_ENV is not set");
    let debug_level = env::var("DEBUG_LEVEL").expect("$DEBUG_LEVEL is not set");

    let (logging_layer, task) = tracing_loki::builder()
        .label("app", app_name)
        .unwrap()
        .label("env", exec_env.clone())
        .unwrap()
        .build_url(
            Url::parse(
                format!(
                    "https://340656:{}@logs-prod-013.grafana.net/",
                    telemetry_key
                )
                    .as_str(),
            )
                .unwrap(),
        )
        .unwrap();

    opentelemetry::global::set_text_map_propagator(TraceContextPropagator::new());

    let filter_str = format!("{}={}", app_name, debug_level);
    let env_filter = EnvFilter::try_new(filter_str).unwrap_or_else(|_| EnvFilter::new("debug"));

    let mut map = MetadataMap::with_capacity(3);

    let encoded = general_purpose::STANDARD.encode(format!("337169:{}", telemetry_key));

    map.insert(
        "authorization",
        format!("Basic {}", encoded).parse().unwrap(),
    );

    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint("https://tempo-prod-08-prod-eu-west-3.grafana.net:443")
                .with_metadata(map),
        )
        .with_trace_config(
            trace::config()
                .with_resource(Resource::new(vec![KeyValue::new("service.name", app_name)])),
        )
        .install_batch(opentelemetry::runtime::Tokio)
        .unwrap();

    let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(logging_layer)
        .with(telemetry_layer)
        .init();

    tokio::spawn(task);

    if env::consts::OS != "macos" {
        telemetry_agent =
            PyroscopeAgent::builder("https://profiles-prod-004.grafana.net", app_name)
                .backend(pprof_backend(PprofConfig::new().sample_rate(100)))
                .basic_auth("491298", telemetry_key)
                .tags([("env", exec_env.as_str())].to_vec())
                .build()
                .unwrap();

        let _ = telemetry_agent.start().unwrap();
    }

    tracing::info!("telemetry successfully set up");
}

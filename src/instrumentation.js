// This is used to instrument the app with opentelemetry
// You probably don't need to change this
// The logger is exported so you can use it in other files
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import pino from "pino";

// Create a Pino logger
export const logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

class PinoSpanExporter {
  export(spans, resultCallback) {
    const filteredSpans = spans.filter(
      (span) =>
        span.instrumentationLibrary.name ===
          "@opentelemetry/instrumentation-http" && span.kind === 1 // SERVER
    );

    filteredSpans.forEach((span) => {
      const durationMs =
        (span.endTime[0] - span.startTime[0]) * 1000 +
        (span.endTime[1] - span.startTime[1]) / 1000000;

      logger.info({
        traceId: span.spanContext().traceId,
        name: span.name,
        kind: span.kind,
        timestamp: span.startTime[0] * 1000 + span.startTime[1] / 1000000,
        duration_ms: durationMs.toFixed(3),
        attributes: {
          method: span.attributes["http.method"],
          url: span.attributes["http.url"],
          status_code: span.attributes["http.status_code"],
        },
        status: span.status.code,
      });
    });

    // Call the resultCallback to signal that export is complete
    resultCallback({ code: 0 });
  }
}

class PinoMetricExporter extends ConsoleMetricExporter {
  export(metrics, resultCallback) {
    metrics.forEach((metric) => {
      if (metric.descriptor.name === "http.server.duration") {
        metric.dataPoints.forEach((dp) => {
          logger.info({
            metric: metric.descriptor.name,
            attributes: dp.attributes,
            value: {
              count: dp.value.count,
              sum: dp.value.sum.toFixed(3),
              avg: (dp.value.sum / dp.value.count).toFixed(3),
            },
          });
        });
      }
    });

    super.export(metrics, resultCallback);
  }
}

const sdk = new NodeSDK({
  traceExporter: new PinoSpanExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new PinoMetricExporter(),
    exportIntervalMillis: 60000, // Export metrics every 60 seconds
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

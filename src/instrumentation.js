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
import { context, propagation, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";

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

// Custom OpenTelemetry Middleware for Hono
export const opentelemetryMiddleware =
  (logger) =>
  async (ctx, next) => {
    const tracer = trace.getTracer("hono-tracer");
    const span = tracer.startSpan("HTTP " + ctx.req.method, {
      kind: SpanKind.SERVER,
      attributes: {
        "http.method": ctx.req.method,
        "http.url": ctx.req.url,
      },
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      const start = performance.now();
      try {
        await next();
        const duration = performance.now() - start;
        span.setAttribute("http.status_code", ctx.res.status);
        span.setAttribute("http.duration_ms", duration);
        span.setStatus({ code: SpanStatusCode.OK });
        logger.info({
          method: ctx.req.method,
          url: ctx.req.url,
          status: ctx.res.status,
          duration_ms: duration.toFixed(3),
        });
      } catch (error) {
        const duration = performance.now() - start;
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "unknown error",
        });
        logger.error({
          method: ctx.req.method,
          url: ctx.req.url,
          error: error instanceof Error ? error.message : "unknown error",
          duration_ms: duration.toFixed(3),
        });
        throw error;
      } finally {
        span.end();
      }
    });
  };
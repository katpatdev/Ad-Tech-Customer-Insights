# Spark Job Stubs (Scala outline)

```scala
// Pseudo-code for interview discussion — not executed in MVP
object DailyCampaignAggregate {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder.appName("aimp-daily-agg").getOrCreate()
    val events = spark.readStream.format("kafka")
      .option("subscribe", "marketing-events").load()
    // parse JSON → normalize currency/timezone → groupBy tenant,campaign,country,day
    // write to JDBC campaign_daily_metrics
  }
}
```

Feature engineering mirrors `workers/processors/metrics.py`.

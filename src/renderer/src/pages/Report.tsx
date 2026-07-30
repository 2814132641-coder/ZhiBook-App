import { useEffect, useMemo, useState } from 'react'
import { App, Card, Col, DatePicker, Empty, Row, Statistic, Button } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import ReactECharts from 'echarts-for-react'
import { formatAmount } from '../utils/format'
import type { MonthlySummary } from '../../../shared/api/index'
import { api } from '../lib/api';
import { useConnection } from '../lib/useConnection'
import { useNavigate } from 'react-router-dom'

export default function Report() {
  const { message } = App.useApp()
  const { online, checking, retry } = useConnection()
  const navigate = useNavigate()

  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(false)

  const monthStr = month.format('YYYY-MM')

  async function load() {
    setLoading(true)
    try {
      const data = await api.stats.monthlySummary(monthStr)
      setSummary(data)
    } catch (e) {
      message.error('加载报表失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr])

  const pieOption = useMemo(() => {
    if (!summary || summary.byCategory.length === 0) return {}
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number; percent: number }) =>
          `${p.name}<br/>${formatAmount(p.value)} (${p.percent}%)`
      },
      legend: { bottom: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: 'var(--color-bg-surface)', borderWidth: 2 },
          label: { formatter: '{b}\n{d}%' },
          data: summary.byCategory.map((c) => ({
            name: c.categoryName,
            value: c.amount,
            itemStyle: { color: c.categoryColor || 'var(--color-brand)' }
          }))
        }
      ]
    }
  }, [summary])

  const barOption = useMemo(() => {
    if (!summary || summary.byCategory.length === 0) return {}
    const top5 = summary.byCategory.slice(0, 5).reverse()
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: { name: string; value: number }[]) =>
          `${params[0].name}<br/>${formatAmount(params[0].value)}`
      },
      grid: { left: 80, right: 30, top: 20, bottom: 20 },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => `¥${v}` } },
      yAxis: { type: 'category', data: top5.map((c) => c.categoryName) },
      series: [
        {
          type: 'bar',
          data: top5.map((c) => ({
            value: c.amount,
            itemStyle: { color: c.categoryColor || 'var(--color-brand)', borderRadius: [0, 4, 4, 0] }
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (p: { value: number }) => formatAmount(p.value)
          },
          barWidth: 18
        }
      ]
    }
  }, [summary])

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <DatePicker.MonthPicker
              value={month}
              onChange={(v) => v && setMonth(v)}
              format="YYYY 年 MM 月"
              allowClear={false}
            />
          </Col>
          <Col flex="auto" />
        </Row>

        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={8}>
            <Statistic
              title="本月支出"
              value={summary?.total ?? 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: 'var(--color-brand)' }}
            />
          </Col>
          <Col span={8}>
            <Statistic title="笔数" value={summary?.count ?? 0} suffix="笔" />
          </Col>
          <Col span={8}>
            <Statistic
              title="日均"
              value={summary?.avgPerDay ?? 0}
              precision={2}
              prefix="¥"
            />
          </Col>
        </Row>
      </Card>

      <Card title="分类饼图" loading={loading} style={{ marginBottom: 16 }}>
        {summary && summary.byCategory.length > 0 ? (
          <ReactECharts option={pieOption} style={{ height: 360 }} />
        ) : online === false ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 20, marginBottom: 12 }}>无法连接到后端</div>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              检测到后端服务不可用，无法生成报表。你可以重试或前往设置查看帮助。
            </div>
            <Button type="primary" loading={checking} onClick={retry} style={{ marginRight: 8 }}>
              重试
            </Button>
            <Button onClick={() => navigate('/settings')}>打开设置</Button>
          </div>
        ) : (
          <Empty description="本月暂无数据" />
        )}
      </Card>

      <Card title="分类排行 Top 5" loading={loading}>
        {summary && summary.byCategory.length > 0 ? (
          <ReactECharts option={barOption} style={{ height: 280 }} />
        ) : online === false ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 20, marginBottom: 12 }}>无法连接到后端</div>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              检测到后端服务不可用，无法生成报表。你可以重试或前往设置查看帮助。
            </div>
            <Button type="primary" loading={checking} onClick={retry} style={{ marginRight: 8 }}>
              重试
            </Button>
            <Button onClick={() => navigate('/settings')}>打开设置</Button>
          </div>
        ) : (
          <Empty description="本月暂无数据" />
        )}
      </Card>
    </div>
  )
}

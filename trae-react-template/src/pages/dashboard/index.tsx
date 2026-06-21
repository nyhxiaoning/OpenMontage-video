import { useSetState } from 'ahooks'
import { useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Progress } from 'antd'
import { UserOutlined, ShoppingCartOutlined, DollarOutlined, EyeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

/**
 * Types
 */
type DashboardState = {
  loading: boolean
  stats: {
    users: number
    orders: number
    revenue: number
    views: number
  }
  recentOrders: any[]
}

/**
 * Constants
 */
const Dashboard: React.FC = () => {
  /**
   * Hooks
   */
  const { t } = useTranslation()

  /**
   * States
   */
  const [state, setState] = useSetState<DashboardState>({
    loading: true,
    stats: {
      users: 0,
      orders: 0,
      revenue: 0,
      views: 0,
    },
    recentOrders: [],
  })

  /**
   * 表格列配置
   */
  const columns = [
    {
      title: t('dashboard.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: t('dashboard.customer'),
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: t('dashboard.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const getStatusText = (status: string) => {
          switch (status) {
            case '已完成':
              return t('dashboard.statusCompleted');
            case '进行中':
              return t('dashboard.statusInProgress');
            case '待处理':
              return t('dashboard.statusPending');
            default:
              return status;
          }
        };
        
        return (
          <span className={`px-2 py-1 rounded text-xs ${
            status === '已完成' ? 'bg-green-100 text-green-800' :
            status === '进行中' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {getStatusText(status)}
          </span>
        );
      },
    },
  ]

  /**
   * Effects
   */
  useEffect(() => {
    // 模拟数据加载
    const loadData = async () => {
      try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setState({
          loading: false,
          stats: {
            users: 1234,
            orders: 567,
            revenue: 89012,
            views: 34567,
          },
          recentOrders: [
            {
              key: '1',
              orderNo: 'ORD-001',
              customer: '张三',
              amount: 1299,
              status: '已完成',
            },
            {
              key: '2',
              orderNo: 'ORD-002',
              customer: '李四',
              amount: 2599,
              status: '进行中',
            },
            {
              key: '3',
              orderNo: 'ORD-003',
              customer: '王五',
              amount: 899,
              status: '待处理',
            },
          ],
        })
      } catch (error) {
        console.error('加载数据失败:', error)
        setState({ loading: false })
      }
    }

    loadData()
  }, [setState])

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('dashboard.welcome')}</p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={state.loading}>
            <Statistic
              title={t('dashboard.totalUsers')}
              value={state.stats.users}
              prefix={<UserOutlined className="text-blue-500" />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={state.loading}>
            <Statistic
              title={t('dashboard.totalOrders')}
              value={state.stats.orders}
              prefix={<ShoppingCartOutlined className="text-green-500" />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={state.loading}>
            <Statistic
              title={t('dashboard.totalRevenue')}
              value={state.stats.revenue}
              prefix={<DollarOutlined className="text-yellow-500" />}
              precision={2}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={state.loading}>
            <Statistic
              title={t('dashboard.todayVisits')}
              value={state.stats.views}
              prefix={<EyeOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 内容区域 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t('dashboard.recentOrders')} loading={state.loading}>
            <Table
              columns={columns}
              dataSource={state.recentOrders}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={t('dashboard.systemStatus')} loading={state.loading}>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{t('dashboard.cpuUsage')}</span>
                  <span className="text-sm">45%</span>
                </div>
                <Progress percent={45} status="active" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{t('dashboard.memoryUsage')}</span>
                  <span className="text-sm">67%</span>
                </div>
                <Progress percent={67} status="active" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{t('dashboard.diskUsage')}</span>
                  <span className="text-sm">23%</span>
                </div>
                <Progress percent={23} status="active" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
import { useSetState } from 'ahooks'
import { useEffect } from 'react'
import { Card, Table, Button, Space, Input, Select, Modal, Form, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserList, createUser, updateUser, deleteUser, type IUser } from '@/services/user'

const { Search } = Input
const { Option } = Select

/**
 * Types
 */
type UserManagementState = {
  modalVisible: boolean
  editingUser: IUser | null
  searchKeyword: string
  selectedRole: string
  pagination: {
    current: number
    pageSize: number
    total: number
  }
}

/**
 * Constants
 */
const UserManagement: React.FC = () => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  /**
   * States
   */
  const [state, setState] = useSetState<UserManagementState>({
    modalVisible: false,
    editingUser: null,
    searchKeyword: '',
    selectedRole: '',
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
    },
  })

  /**
   * Queries
   */
  const { data: userListData, isLoading } = useQuery({
    queryKey: ['userList', state.pagination.current, state.pagination.pageSize, state.searchKeyword, state.selectedRole],
    queryFn: () => getUserList({
      page: state.pagination.current,
      pageSize: state.pagination.pageSize,
      keyword: state.searchKeyword,
      role: state.selectedRole,
    }),
  })

  /**
   * Mutations
   */
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      message.success('用户创建成功')
      setState({ modalVisible: false })
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['userList'] })
    },
    onError: () => {
      message.error('用户创建失败')
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IUser> }) => updateUser(id, data),
    onSuccess: () => {
      message.success('用户更新成功')
      setState({ modalVisible: false, editingUser: null })
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['userList'] })
    },
    onError: () => {
      message.error('用户更新失败')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      message.success('用户删除成功')
      queryClient.invalidateQueries({ queryKey: ['userList'] })
    },
    onError: () => {
      message.error('用户删除失败')
    },
  })

  /**
   * 表格列配置
   */
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <span className={`px-2 py-1 rounded text-xs ${
          role === 'admin' ? 'bg-red-100 text-red-800' :
          role === 'user' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {role}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: IUser) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  /**
   * Events
   */
  const handleSearch = (value: string) => {
    setState({ 
      searchKeyword: value,
      pagination: { ...state.pagination, current: 1 }
    })
  }

  const handleRoleChange = (value: string) => {
    setState({ 
      selectedRole: value,
      pagination: { ...state.pagination, current: 1 }
    })
  }

  const handleAdd = () => {
    setState({ modalVisible: true, editingUser: null })
    form.resetFields()
  }

  const handleEdit = (user: IUser) => {
    setState({ modalVisible: true, editingUser: user })
    form.setFieldsValue(user)
  }

  const handleDelete = (id: number) => {
    deleteUserMutation.mutate(id)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      
      if (state.editingUser) {
        updateUserMutation.mutate({
          id: state.editingUser.id,
          data: values,
        })
      } else {
        createUserMutation.mutate(values)
      }
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const handleModalCancel = () => {
    setState({ modalVisible: false, editingUser: null })
    form.resetFields()
  }

  const handleTableChange = (pagination: any) => {
    setState({
      pagination: {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
      },
    })
  }

  /**
   * Effects
   */
  useEffect(() => {
    if (userListData) {
      setState({
        pagination: {
          ...state.pagination,
          total: userListData.data.total,
        },
      })
    }
  }, [userListData, setState])

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">用户管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">管理系统用户信息</p>
      </div>

      {/* 操作栏 */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Search
              placeholder="搜索用户名或邮箱"
              allowClear
              onSearch={handleSearch}
              style={{ width: 250 }}
              enterButton={<SearchOutlined />}
            />
            <Select
              placeholder="选择角色"
              allowClear
              style={{ width: 120 }}
              onChange={handleRoleChange}
            >
              <Option value="admin">管理员</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增用户
          </Button>
        </div>
      </Card>

      {/* 用户表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={userListData?.data.list || []}
          loading={isLoading}
          pagination={{
            current: state.pagination.current,
            pageSize: state.pagination.pageSize,
            total: state.pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          rowKey="id"
        />
      </Card>

      {/* 用户表单弹窗 */}
      <Modal
        title={state.editingUser ? '编辑用户' : '新增用户'}
        open={state.modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={createUserMutation.isPending || updateUserMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </Form.Item>
          
          {!state.editingUser && (
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement
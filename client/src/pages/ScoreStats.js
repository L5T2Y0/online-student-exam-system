import React, { useState, useEffect } from 'react';
import { Card, Statistic, Table, Row, Col } from 'antd';
import api from '../utils/api';

const ScoreStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/scores/stats');
      setStats(res.data.stats);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const paperColumns = [
    {
      title: '试卷名称',
      dataIndex: 'paper',
      key: 'paper',
    },
    {
      title: '考试人数',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: '平均分',
      dataIndex: 'average',
      key: 'average',
    },
    {
      title: '最高分',
      dataIndex: 'highest',
      key: 'highest',
    },
    {
      title: '最低分',
      dataIndex: 'lowest',
      key: 'lowest',
    },
  ];

  const paperData = stats?.byPaper
    ? Object.keys(stats.byPaper).map(paper => ({
        key: paper,
        paper,
        ...stats.byPaper[paper]
      }))
    : [];

  return (
    <div>
      <h2>成绩统计</h2>
      {stats && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic title="总考试数" value={stats.total} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="平均分" value={stats.average} precision={2} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="最高分" value={stats.highest} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="最低分" value={stats.lowest} />
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card>
                <Statistic title="及格人数" value={stats.passCount} valueStyle={{ color: '#3f8600' }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic title="不及格人数" value={stats.failCount} valueStyle={{ color: '#cf1322' }} />
              </Card>
            </Col>
          </Row>
          <Card title="按试卷统计">
            <Table
              columns={paperColumns}
              dataSource={paperData}
              loading={loading}
              pagination={false}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default ScoreStats;


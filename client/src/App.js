import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import QuestionList from './pages/QuestionList';
import QuestionForm from './pages/QuestionForm';
import PaperList from './pages/PaperList';
import PaperForm from './pages/PaperForm';
import ExamList from './pages/ExamList';
import ExamDetail from './pages/ExamDetail';
import ScoreList from './pages/ScoreList';
import ScoreStats from './pages/ScoreStats';
import WrongQuestions from './pages/WrongQuestions';
import UserList from './pages/UserList';
import Profile from './pages/Profile';

function App() {
  return (
    <AntApp>
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/questions" element={<QuestionList />} />
                      <Route path="/questions/new" element={<QuestionForm />} />
                      <Route path="/questions/edit/:id" element={<QuestionForm />} />
                      <Route path="/papers" element={<PaperList />} />
                      <Route path="/papers/new" element={<PaperForm />} />
                      <Route path="/papers/edit/:id" element={<PaperForm />} />
                      <Route path="/exams" element={<ExamList />} />
                      <Route path="/exams/:id" element={<ExamDetail />} />
                      <Route path="/scores" element={<ScoreList />} />
                      <Route path="/scores/stats" element={<ScoreStats />} />
                      <Route path="/scores/wrong" element={<WrongQuestions />} />
                      <Route path="/users" element={<UserList />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </AntApp>
  );
}

export default App;


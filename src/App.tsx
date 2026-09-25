/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { StoreProvider } from './store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ClassDetail } from './pages/ClassDetail';
import { ActivityDetail } from './pages/ActivityDetail';
import { SessionDetail } from './pages/SessionDetail';
import { Observe } from './pages/Observe';
import { Project } from './pages/Project';
import { StudentDetail } from './pages/StudentDetail';
import { ClassSynthesis } from './pages/ClassSynthesis';
import { Import } from './pages/Import';
import { Library } from './pages/Library';
import { LibraryDetail } from './pages/LibraryDetail';
import { TeacherSessionEntry } from './pages/TeacherSessionEntry';

export default function App() {
  return (
    <StoreProvider>
      <Router>
        <Routes>
          <Route path="/observe/:sessionId" element={<Observe />} />
          <Route path="/project/:sessionId" element={<Project />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="class/:classId" element={<ClassDetail />} />
            <Route path="class/:classId/synthesis" element={<ClassSynthesis />} />
            <Route path="activity/:activityId" element={<ActivityDetail />} />
            <Route path="session/:sessionId" element={<SessionDetail />} />
            <Route path="session/:sessionId/entry" element={<TeacherSessionEntry />} />
            <Route path="student/:studentId/class/:classId" element={<StudentDetail />} />
            <Route path="import" element={<Import />} />
            <Route path="library" element={<Library />} />
            <Route path="library/:templateId" element={<LibraryDetail />} />
          </Route>
        </Routes>
      </Router>
    </StoreProvider>
  );
}


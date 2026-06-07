import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import ApplyPage from './pages/ApplyPage';
import Salaries from './pages/Salaries';
import Companies from './pages/Companies';
import CompanyDetails from './pages/CompanyDetails';
import About from './pages/About';
import Contact from './pages/Contact';
import CorporateContact from './pages/CorporateContact';
import Auth from './pages/Auth';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import CompaniesManager from './pages/admin/CompaniesManager';
import CompanyProfile from './pages/admin/CompanyProfile';
import ApplicationsManager from './pages/admin/ApplicationsManager';
import SettingsManager from './pages/admin/SettingsManager';
import CandidateRoute from './components/CandidateRoute';
import CandidateLayout from './pages/candidate/CandidateLayout';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import CandidateApplications from './pages/candidate/CandidateApplications';
import CandidateSavedJobs from './pages/candidate/CandidateSavedJobs';
import CandidateProfile from './pages/candidate/CandidateProfile';

function MainLayout() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/apply/:id" element={<ApplyPage />} />
        <Route path="/salaries" element={<Salaries />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/corporate-contact" element={<CorporateContact />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        {/* Fallback routing for unbuilt pages */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center pt-20">
            <h1 className="text-3xl text-gray-400 font-light">Page under construction...</h1>
          </div>
        } />
      </Routes>
      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-voxa-bg text-white selection:bg-voxa-cyan selection:text-black">
        <Routes>
          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="companies" element={<CompaniesManager />} />
              <Route path="companies/:id" element={<CompanyProfile />} />
              <Route path="applications" element={<ApplicationsManager />} />
              <Route path="settings" element={<SettingsManager />} />
            </Route>
          </Route>

          {/* Protected Candidate Routes */}
          <Route path="/candidate" element={<CandidateRoute />}>
            <Route element={<CandidateLayout />}>
              <Route index element={<CandidateDashboard />} />
              <Route path="applications" element={<CandidateApplications />} />
              <Route path="saved" element={<CandidateSavedJobs />} />
              <Route path="profile" element={<CandidateProfile />} />
            </Route>
          </Route>

          {/* Public Routes with Navbar */}
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

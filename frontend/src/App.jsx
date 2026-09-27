import { Routes, Route } from 'react-router-dom'
import { RfHome, RfSearch, RfDetail } from './Redfin.jsx'
import { Home, ForSale, ForRent, Detail, Simple } from './Zillow.jsx'
export default function App() {
  return <Routes><Route path="/" element={<Home />} /><Route path="/for-sale" element={<ForSale />} /><Route path="/rent" element={<ForRent />} /><Route path="/property/:id" element={<Detail />} /><Route path="/redfin" element={<RfHome />} /><Route path="/redfin/homes" element={<RfSearch />} /><Route path="/redfin/property/:id" element={<RfDetail />} /><Route path="/:page" element={<Simple />} /></Routes>
}

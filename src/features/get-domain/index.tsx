

// import React, { useState } from 'react'
// import { Search, Check, X, Loader } from 'lucide-react'
// import godaddyLogo from '../../assets/brand-icons/godaddy.png'
// import bigrockLogo from '../../assets/brand-icons/bigrock.jpg'
// import hostingerLogo from '../../assets/brand-icons/hostinger.png'

// interface DomainResult {
//   id: string
//   name: string
//   extension: string
//   fullDomain: string
//   isAvailable: boolean
//   registrar: string
// }

// const GetDomainPage: React.FC = () => {
//   const [searchQuery, setSearchQuery] = useState('')
//   const [domainResults, setDomainResults] = useState<DomainResult[]>([])
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasSearched, setHasSearched] = useState(false)

//   const extensions = ['.com', '.in', '.net', '.store', '.shop', '.io', '.co', '.org']

//   const sanitize = (q: string) => {
//     let s = q.trim().toLowerCase()
//     // strip protocol / www and trailing slash
//     s = s.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
//     // remove any known TLD from the end
//     extensions.forEach((ext) => {
//       if (s.endsWith(ext)) {
//         s = s.slice(0, -ext.length)
//       }
//     })
//     return s
//   }

//   const generateDomainResults = (query: string): DomainResult[] => {
//     const base = sanitize(query)
//     return extensions.map((ext, index) => ({
//       id: `${index}`,
//       name: base,
//       extension: ext,
//       fullDomain: `${base}${ext}`,
//       isAvailable: Math.random() > 0.2,
//       registrar: 'GoDaddy',
//     }))
//   }

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!searchQuery.trim()) return

//     setIsLoading(true)
//     setHasSearched(true)

//     setTimeout(() => {
//       setDomainResults(generateDomainResults(searchQuery)) 
//       setIsLoading(false)
//     }, 800)
//   }

//   const handleProviderClick = (provider: string, fullDomain: string) => {
//     let url = ''
//     switch (provider) {
//       case 'GoDaddy':
//         url = `https://www.godaddy.com/en-in/domainsearch/find?domainToCheck=${encodeURIComponent(fullDomain)}`
//         break
//       case 'BigRock':
//         url = `https://www.bigrock.com/domain-search?domain=${encodeURIComponent(fullDomain)}`
//         break
//       case 'Hostinger':
//         url = `https://www.hostinger.in/domain-checker?domain=${encodeURIComponent(fullDomain)}`
//         break
//       default:
//         return
//     }
//     window.open(url, '_blank', 'noopener,noreferrer')
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
//       <div className="max-w-6xl mx-auto">
//         {/* Header Section */}
//         <div className="text-center mb-12">
//           <div className="flex items-center justify-center gap-3 mb-4">
//             <div className="bg-blue-600 p-3 rounded-lg">
//               <Search className="w-8 h-8 text-white" />
//             </div>
//             <h1 className="text-4xl font-bold text-gray-900">Get Domain</h1>
//           </div>
//           <p className="text-lg text-gray-600">
//             Search and register your perfect domain name instantly
//           </p>
//         </div>

//         {/* Search Section */}
//         <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
//           <form onSubmit={handleSearch}>
//             <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
//               <Search className="w-6 h-6 text-blue-600" />
//               Domain Name Search
//             </h2>

//             <div className="mb-4">
//               <label className="block text-sm font-semibold text-gray-700 mb-3">
//                 Enter your desired domain name
//               </label>
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="e.g., example (without .com, .in, etc.)"
//                 className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 transition"
//               />
//               <p className="text-sm text-gray-500 mt-2">
//                 Type a keyword without the domain extension
//               </p>
//             </div>

//             <button
//               type="submit"
//               disabled={isLoading || !searchQuery.trim()}
//               className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl transition duration-300 flex items-center justify-center gap-2"
//             >
//               {isLoading ? (
//                 <>
//                   <Loader className="w-5 h-5 animate-spin" />
//                   Searching...
//                 </>
//               ) : (
//                 <>
//                   <Search className="w-5 h-5" />
//                   Search Domains
//                 </>
//               )}
//             </button>
//           </form>
//         </div>

//         {/* Results Section */}
//         {hasSearched && (
//           <div className="bg-white rounded-2xl shadow-lg p-8">
//             <h2 className="text-2xl font-bold text-gray-900 mb-6">
//               Available domain suggestions
//               {domainResults.length > 0 && (
//                 <span className="text-blue-600 ml-2">({domainResults.length})</span>
//               )}
//             </h2>

//             {isLoading ? (
//               <div className="flex items-center justify-center py-12">
//                 <Loader className="w-8 h-8 animate-spin text-blue-600" />
//               </div>
//             ) : domainResults.length > 0 ? (
//               <div className="space-y-3">
//                 {domainResults.map((domain) => (
//                   <div
//                     key={domain.id}
//                     className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:shadow-md transition duration-300 group"
//                   >
//                     <div className="flex items-center gap-4 flex-1">
//                       <div className="flex-shrink-0">
//                         {domain.isAvailable ? (
//                           <div className="bg-green-100 p-3 rounded-lg">
//                             <Check className="w-6 h-6 text-green-600" />
//                           </div>
//                         ) : (
//                           <div className="bg-red-100 p-3 rounded-lg">
//                             <X className="w-6 h-6 text-red-600" />
//                           </div>
//                         )}
//                       </div>

//                       <div className="flex-1">
//                         <h3 className="text-lg font-bold text-gray-900">
//                           {domain.fullDomain}
//                         </h3>
//                       </div>
//                     </div>

//                     {/* Provider Logos */}
//                     {domain.isAvailable && (
//                       <div className="flex items-center gap-4">
//                         <button
//                           onClick={() => handleProviderClick('GoDaddy', domain.fullDomain)}
//                           className="p-2 rounded-lg hover:bg-gray-100 transition"
//                           title="GoDaddy"
//                         >
//                           <img
//                             src={godaddyLogo}
//                             alt="GoDaddy"
//                             className="w-auto h-8 object-contain"
//                           />
//                         </button>
//                         <button
//                           onClick={() => handleProviderClick('BigRock', domain.fullDomain)}
//                           className="p-2 rounded-lg hover:bg-gray-100 transition"
//                           title="BigRock"
//                         >
//                           <img
//                             src={bigrockLogo}
//                             alt="BigRock"
//                             className="w-auto h-8 object-contain"
//                           />
//                         </button>
//                         <button
//                           onClick={() => handleProviderClick('Hostinger', domain.fullDomain)}
//                           className="p-2 rounded-lg hover:bg-gray-100 transition"
//                           title="Hostinger"
//                         >
//                           <img 
//                             src={hostingerLogo}
//                             alt="Hostinger"
//                             className="w-auto h-8 object-contain"
//                           /> 
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-center py-12">
//                 <p className="text-gray-500 text-lg">No domains found. Try another search.</p>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Benefits Section */}
//         {!hasSearched && (
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
//               <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
//                 <Search className="w-6 h-6 text-green-600" />
//               </div>
//               <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Search</h3>
//               <p className="text-gray-600">
//                 Get domain suggestions instantly with multiple TLDs to find the perfect fit
//               </p>
//             </div>

//             <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
//               <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
//                 <Search className="w-6 h-6 text-blue-600" />
//               </div>
//               <h3 className="text-lg font-bold text-gray-900 mb-2">Multiple Providers</h3>
//               <p className="text-gray-600">
//                 Compare and purchase from top domain providers like GoDaddy, BigRock, and Hostinger
//               </p>
//             </div>

//             <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
//               <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
//                 <span className="text-purple-600 font-bold">5+</span>
//               </div>
//               <h3 className="text-lg font-bold text-gray-900 mb-2">5 TLD Options</h3>
//               <p className="text-gray-600">
//                 Choose from .com, .in, .store, .shop, .net and more extensions
//               </p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// export default GetDomainPage


// import React, { useState } from 'react'
// import { Search, Check, X, Loader } from 'lucide-react'
// import godaddyLogo from '../../assets/brand-icons/godaddy.png'
// import bigrockLogo from '../../assets/brand-icons/bigrock.jpg'
// import hostingerLogo from '../../assets/brand-icons/hostinger.png'

// interface DomainResult {
//   id: string
//   name: string
//   extension: string
//   fullDomain: string
//   isAvailable: boolean
//   registrar: string
// }

// const GetDomainPage: React.FC = () => {
//   const [searchQuery, setSearchQuery] = useState('')
//   const [domainResults, setDomainResults] = useState<DomainResult[]>([])
//   const [isLoading, setIsLoading] = useState(false)
//   const [hasSearched, setHasSearched] = useState(false)

//   const extensions = ['.com', '.in', '.net', '.store', '.shop', '.io', '.co', '.org']

//   const sanitize = (q: string) => {
//     let s = q.trim().toLowerCase()
//     s = s.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
//     extensions.forEach((ext) => {
//       if (s.endsWith(ext)) {
//         s = s.slice(0, -ext.length)
//       }
//     })
//     return s
//   }

//   const generateDomainResults = (query: string): DomainResult[] => {
//     const base = sanitize(query)
//     return extensions.map((ext, index) => ({
//       id: `${index}`,
//       name: base,
//       extension: ext,
//       fullDomain: `${base}${ext}`,
//       isAvailable: Math.random() > 0.2,
//       registrar: 'GoDaddy',
//     }))
//   }

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!searchQuery.trim()) return

//     setIsLoading(true)
//     setHasSearched(true)

//     setTimeout(() => {
//       setDomainResults(generateDomainResults(searchQuery))
//       setIsLoading(false)
//     }, 800)
//   }

//   const handleProviderClick = (provider: string, fullDomain: string) => {
//     let url = ''
//     switch (provider) {
//       case 'GoDaddy':
//         url = `https://www.godaddy.com/en-in/domainsearch/find?domainToCheck=${encodeURIComponent(fullDomain)}`
//         break

//       /* ✅ FIXED BIGROCK URL */
//       case 'BigRock':
//         url = `https://www.bigrock.in/domain-registration/index.php?domain=${encodeURIComponent(fullDomain)}`
//         break

//       case 'Hostinger':
//         url = `https://www.hostinger.in/domain-checker?domain=${encodeURIComponent(fullDomain)}`
//         break
//       default:
//         return
//     }

//     window.open(url, '_blank', 'noopener,noreferrer')
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
//       <div className="max-w-6xl mx-auto">
//         {/* Header Section */}
//         <div className="text-center mb-12">
//           <div className="flex items-center justify-center gap-3 mb-4">
//             <div className="bg-blue-600 p-3 rounded-lg">
//               <Search className="w-8 h-8 text-white" />
//             </div>
//             <h1 className="text-4xl font-bold text-gray-900">Get Your Domain</h1>
//           </div>
//           <p className="text-lg text-gray-600">
//             Search and register your perfect domain name instantly
//           </p>
//         </div>

//         {/* Search Section */}
//         <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
//           <form onSubmit={handleSearch}>
//             <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
//               <Search className="w-6 h-6 text-blue-600" />
//               Domain Name Search
//             </h2>

//             <div className="mb-4">
//               <label className="block text-sm font-semibold text-gray-700 mb-3">
//                 Enter your desired domain name
//               </label>
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="e.g., example (without .com, .in, etc.)"
//                 className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 transition"
//               />
//               <p className="text-sm text-gray-500 mt-2">
//                 Type a keyword without the domain extension
//               </p>
//             </div>

//             <button
//               type="submit"
//               disabled={isLoading || !searchQuery.trim()}
//               className=" bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl transition duration-300 flex items-center justify-center gap-2"
//             >
//               {isLoading ? (
//                 <>
//                   <Loader className="w-5 h-5 animate-spin" />
//                   Searching...
//                 </>
//               ) : (
//                 <>
//                   <Search className="w-5 h-5" />
//                   Search Domains
//                 </>
//               )}
//             </button>
//           </form>
//         </div>

//         {/* Results Section */}
//         {hasSearched && (
//           <div className="bg-white rounded-2xl shadow-lg p-8">
//             <h2 className="text-2xl font-bold text-gray-900 mb-6">
//               Available domain suggestions
//               {domainResults.length > 0 && (
//                 <span className="text-blue-600 ml-2">({domainResults.length})</span>
//               )}
//             </h2>

//             {isLoading ? (
//               <div className="flex items-center justify-center py-12">
//                 <Loader className="w-8 h-8 animate-spin text-blue-600" />
//               </div>
//             ) : domainResults.length > 0 ? (
//               <div className="space-y-3">
//                 {domainResults.map((domain) => (
//                   <div
//                     key={domain.id}
//                     className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:shadow-md transition duration-300 group"
//                   >
//                     <div className="flex items-center gap-4 flex-1">
//                       <div className="flex-shrink-0">
//                         {domain.isAvailable ? (
//                           <div className="bg-green-100 p-3 rounded-lg">
//                             <Check className="w-6 h-6 text-green-600" />
//                           </div>
//                         ) : (
//                           <div className="bg-red-100 p-3 rounded-lg">
//                             <X className="w-6 h-6 text-red-600" />
//                           </div>
//                         )}
//                       </div>

//                       <div className="flex-1">
//                         <h3 className="text-lg font-bold text-gray-900">
//                           {domain.fullDomain}
//                         </h3>
//                       </div>
//                     </div>

//                     {/* Provider Logos */}
//                     {domain.isAvailable && (
//                       <div className="flex items-center gap-4">

//                         {/* GoDaddy */}
//                         <button
//                           onClick={() => handleProviderClick('GoDaddy', domain.fullDomain)}
//                           className="relative group p-2 rounded-lg hover:bg-gray-100 transition"
//                         >
//                           <img src={godaddyLogo} alt="GoDaddy" className="w-auto h-8 object-contain" />
//                           <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-black text-white px-2 py-1 rounded">
//                             GoDaddy
//                           </span>
//                         </button>

//                         {/* BigRock */}
//                         <button
//                           onClick={() => handleProviderClick('BigRock', domain.fullDomain)}
//                           className="relative group p-2 rounded-lg hover:bg-gray-100 transition"
//                         >
//                           <img src={bigrockLogo} alt="BigRock" className="w-auto h-8 object-contain" />
//                           <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-black text-white px-2 py-1 rounded">
//                             BigRock
//                           </span>
//                         </button>

//                         {/* Hostinger */}
//                         <button
//                           onClick={() => handleProviderClick('Hostinger', domain.fullDomain)}
//                           className="relative group p-2 rounded-lg hover:bg-gray-100 transition"
//                         >
//                           <img src={hostingerLogo} alt="Hostinger" className="w-auto h-8 object-contain" />
//                           <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-black text-white px-2 py-1 rounded">
//                             Hostinger
//                           </span>
//                         </button>

//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-center py-12">
//                 <p className="text-gray-500 text-lg">No domains found. Try another search.</p>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Benefits Section */}
//         {!hasSearched && (
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
//               <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
//                 <Search className="w-6 h-6 text-green-600" />
//               </div>
//               <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Search</h3>
//               <p className="text-gray-600">
//                 Get domain suggestions instantly with multiple TLDs to find the perfect fit
//               </p>
//             </div>

//             <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
//               <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
//                 <Search className="w-6 h-6 text-blue-600" />
//               </div>
//               <h3 className="text-lg font-bold text-gray-900 mb-2">Multiple Providers</h3>
//               <p className="text-gray-600">
//                 Compare and purchase from top domain providers like GoDaddy, BigRock, and Hostinger
//               </p>
//             </div>

//             <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
//               <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
//                 <span className="text-purple-600 font-bold">5+</span>
//               </div>
//               <h3 className="text-lg font-bold text-gray-900 mb-2">5 TLD Options</h3>
//               <p className="text-gray-600">
//                 Choose from .com, .in, .store, .shop, .net and more extensions
//               </p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// export default GetDomainPage


import React, { useState, useEffect } from 'react'
import { Search, Check, X, Loader, Globe } from 'lucide-react'
import godaddyLogo from '../../assets/brand-icons/godaddy.png'
import bigrockLogo from '../../assets/brand-icons/bigrock.jpg'
import hostingerLogo from '../../assets/brand-icons/hostinger.png'

interface DomainResult {
  id: string
  name: string
  extension: string
  fullDomain: string
  isAvailable: boolean
  registrar: string
}

const GetDomainPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [domainResults, setDomainResults] = useState<DomainResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Trigger entry animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const extensions = ['.com', '.in', '.net', '.store', '.shop', '.io', '.co', '.org']

  const sanitize = (q: string) => {
    let s = q.trim().toLowerCase()
    s = s.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
    extensions.forEach((ext) => {
      if (s.endsWith(ext)) {
        s = s.slice(0, -ext.length)
      }
    })
    return s
  }

  const generateDomainResults = (query: string): DomainResult[] => {
    const base = sanitize(query)
    return extensions.map((ext, index) => ({
      id: `${index}`,
      name: base,
      extension: ext,
      fullDomain: `${base}${ext}`,
      isAvailable: Math.random() > 0.2,
      registrar: 'GoDaddy',
    }))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setHasSearched(true)

    setTimeout(() => {
      setDomainResults(generateDomainResults(searchQuery))
      setIsLoading(false)
    }, 800)
  }

  const handleProviderClick = (provider: string, fullDomain: string) => {
    let url = ''
    switch (provider) {
      case 'GoDaddy':
        url = `https://www.godaddy.com/en-in/domainsearch/find?domainToCheck=${encodeURIComponent(fullDomain)}`
        break
      case 'BigRock':
        url = `https://www.bigrock.in/domain-registration/index.php?domain=${encodeURIComponent(fullDomain)}`
        break
      case 'Hostinger':
        url = `https://www.hostinger.in/domain-checker?domain=${encodeURIComponent(fullDomain)}`
        break
      default:
        return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.93); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes resultRow {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(37,99,235,0.25); }
          70%  { box-shadow: 0 0 0 10px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }

        .animate-fade-slide-down  { animation: fadeSlideDown 0.55s cubic-bezier(.22,1,.36,1) both; }
        .animate-fade-slide-up    { animation: fadeSlideUp  0.55s cubic-bezier(.22,1,.36,1) both; }
        .animate-fade-in          { animation: fadeIn       0.45s ease both; }
        .animate-scale-in         { animation: scaleIn      0.5s  cubic-bezier(.22,1,.36,1) both; }
        .animate-result-row       { animation: resultRow    0.45s cubic-bezier(.22,1,.36,1) both; }
        .search-input-focus:focus { animation: pulse-ring 0.6s ease; }

        .delay-100 { animation-delay: 0.10s; }
        .delay-150 { animation-delay: 0.15s; }
        .delay-200 { animation-delay: 0.20s; }
        .delay-250 { animation-delay: 0.25s; }
        .delay-300 { animation-delay: 0.30s; }
        .delay-350 { animation-delay: 0.35s; }
        .delay-400 { animation-delay: 0.40s; }
        .delay-450 { animation-delay: 0.45s; }
        .delay-500 { animation-delay: 0.50s; }
        .delay-550 { animation-delay: 0.55s; }
        .delay-600 { animation-delay: 0.60s; }
        .delay-650 { animation-delay: 0.65s; }
        .delay-700 { animation-delay: 0.70s; }

        .domain-card {
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .domain-card:hover {
          transform: translateY(-1px);
        }
      `}</style>

      <div
        className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.15s' }}
      >
        <div className="max-w-6xl mx-auto">

          {/* ── Header ── */}
          <div className="text-center mb-12">
            <div className={`flex items-center justify-center gap-3 mb-4 animate-fade-slide-down`}>
              <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">Get Your Domain</h1>
            </div>
            <p className={`text-lg text-gray-500 animate-fade-slide-down delay-100`}>
              Search and register your perfect domain name instantly
            </p>
          </div>

          {/* ── Search Card ── */}
          <div className={`bg-white rounded-2xl shadow-lg p-8 mb-8 animate-scale-in delay-150`}>
            <form onSubmit={handleSearch}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Search className="w-6 h-6 text-blue-600" />
                Domain Name Search
              </h2>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Enter your desired domain name
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., example (without .com, .in, etc.)"
                  className="search-input-focus w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors duration-200"
                />
                <p className="text-sm text-gray-400 mt-2">
                  Type a keyword without the domain extension
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-7 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-md shadow-blue-100"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search Domains
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Results ── */}
          {hasSearched && (
            <div className={`bg-white rounded-2xl shadow-lg p-8 animate-scale-in`}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Available domain suggestions
                {domainResults.length > 0 && (
                  <span className="text-blue-600 ml-2">({domainResults.length})</span>
                )}
              </h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : domainResults.length > 0 ? (
                <div className="space-y-3">
                  {domainResults.map((domain, i) => (
                    <div
                      key={domain.id}
                      className="domain-card animate-result-row flex items-center justify-between p-5 border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:shadow-md group"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0">
                          {domain.isAvailable ? (
                            <div className="bg-green-100 p-3 rounded-lg">
                              <Check className="w-6 h-6 text-green-600" />
                            </div>
                          ) : (
                            <div className="bg-red-100 p-3 rounded-lg">
                              <X className="w-6 h-6 text-red-600" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">{domain.fullDomain}</h3>
                          {!domain.isAvailable && (
                            <span className="text-xs text-red-400 font-medium">Not available</span>
                          )}
                        </div>
                      </div>

                      {/* Provider logos */}
                      {domain.isAvailable && (
                        <div className="flex items-center gap-3">
                          {/* GoDaddy */}
                          <button
                            onClick={() => handleProviderClick('GoDaddy', domain.fullDomain)}
                            className="relative group/btn p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <img src={godaddyLogo} alt="GoDaddy" className="w-auto h-8 object-contain" />
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap transition-opacity">
                              GoDaddy
                            </span>
                          </button>

                          {/* BigRock */}
                          <button
                            onClick={() => handleProviderClick('BigRock', domain.fullDomain)}
                            className="relative group/btn p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <img src={bigrockLogo} alt="BigRock" className="w-auto h-8 object-contain" />
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap transition-opacity">
                              BigRock
                            </span>
                          </button>

                          {/* Hostinger */}
                          <button
                            onClick={() => handleProviderClick('Hostinger', domain.fullDomain)}
                            className="relative group/btn p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <img src={hostingerLogo} alt="Hostinger" className="w-auto h-8 object-contain" />
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap transition-opacity">
                              Hostinger
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No domains found. Try another search.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Benefits (pre-search) ── */}
          {!hasSearched && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  bg: 'bg-green-100', icon: <Search className="w-6 h-6 text-green-600" />,
                  title: 'Instant Search',
                  desc: 'Get domain suggestions instantly with multiple TLDs to find the perfect fit',
                  delay: 'delay-250',
                },
                {
                  bg: 'bg-blue-100', icon: <Search className="w-6 h-6 text-blue-600" />,
                  title: 'Multiple Providers',
                  desc: 'Compare and purchase from top domain providers like GoDaddy, BigRock, and Hostinger',
                  delay: 'delay-350',
                },
                {
                  bg: 'bg-purple-100', icon: <span className="text-purple-600 font-bold text-sm">5+</span>,
                  title: '5 TLD Options',
                  desc: 'Choose from .com, .in, .store, .shop, .net and more extensions',
                  delay: 'delay-450',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 animate-fade-slide-up ${card.delay}`}
                >
                  <div className={`${card.bg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default GetDomainPage

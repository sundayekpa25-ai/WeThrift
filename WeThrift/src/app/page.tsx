export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to WeThrift
          </h1>
          <p className="text-xl text-gray-600">
            Your community thrift platform is ready!
          </p>
        </div>
        
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">Community Groups</h3>
              <p className="text-gray-600">Create and manage thrift groups</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">Savings & Loans</h3>
              <p className="text-gray-600">Flexible savings and loan products</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">Multiple Channels</h3>
              <p className="text-gray-600">USSD, Mobile App, and Web Portal</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Get Started
          </h2>
          <div className="max-w-md mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Quick Access</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">USSD Code:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded">*123#</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Mobile App:</span>
                  <span className="text-green-600">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Web Portal:</span>
                  <span className="text-blue-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

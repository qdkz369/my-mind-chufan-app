/**
 * 测试报修列表 API
 * 用于诊断 401 错误和数据加载问题
 */

async function testRepairAPI() {
  const url = "http://localhost:3000/api/repair/list"
  
  console.log("测试报修列表 API...")
  console.log("URL:", url)
  
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    console.log("响应状态:", response.status, response.statusText)
    console.log("响应头:", Object.fromEntries(response.headers.entries()))
    
    const text = await response.text()
    console.log("响应内容:", text)
    
    try {
      const json = JSON.parse(text)
      console.log("解析后的 JSON:", JSON.stringify(json, null, 2))
    } catch {
      console.log("响应不是有效的 JSON")
    }
  } catch (error) {
    console.error("请求失败:", error)
  }
}

// 如果直接运行此脚本
if (typeof window === "undefined") {
  testRepairAPI()
}

export { testRepairAPI }

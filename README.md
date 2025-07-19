<!--
 * @Author: ZYXin
 * @Date: 2025-03-18 15:41:01
 * @LastEditTime: 2025-07-19 15:28:37
 * @FilePath: /vps/README.md
-->
# 服务器资产管理系统 🖥️

![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-v14+-green.svg)
![Express](https://img.shields.io/badge/express-^4.17.1-lightgrey.svg)

一个基于 Node.js 和 Express 的服务器资产管理和监控系统，提供直观的 Web 界面来展示和管理多个服务器的详细信息，包括 CPU、内存、存储、带宽、IP 地址、价格、支付方式、购买日期等。

## ✨ 特性

- 📊 **双视图模式**：支持按提供商分组和全部服务器两种视图
- 🕐 **实时更新**：自动获取汇率信息和服务器状态
- 🎨 **响应式设计**：适配桌面和移动设备
- 📈 **状态监控**：区分活跃服务器和已到期服务器
- 💰 **成本计算**：自动计算人民币价格（基于实时汇率）
- 🔄 **定时任务**：支持定时更新服务器信息
- 📁 **文件监控**：自动检测配置文件变化并重新加载

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/zyxinab/vps.git
cd vps_new
# 安装依赖
npm install
# 复制示例配置文件
cp servers.json.example servers.json
# 编辑配置文件，添加您的服务器信息
# 请根据实际情况修改 servers.json 文件
```

### 运行

```bash
# 1. 分割提供商数据
npm run split
# 2. 启动服务器
npm start
# 访问应用
# 浏览器打开 http://localhost:8655
```

## 📁 项目结构

```
vps/
├── public/                 # 前端静态文件
│   ├── index.html         # 主页面
│   └── styles.css         # 样式文件
├── providers/             # 提供商分组数据
├── server.js              # 后端服务器
├── servers.json.example   # 配置文件示例
├── providers-splitter.js  # 数据分割工具
├── package.json           # 项目配置
├── .gitignore             # Git忽略文件
├── LICENSE                # CC BY-NC 4.0许可证
└── README.md              # 项目文档
```

## 🔧 配置
### 服务器数据配置
1. 复制示例配置文件：
```bash
cp servers.json.example servers.json
```
2. 编辑 `servers.json` 文件来添加或修改服务器信息：
```json
[
    {
        "provider": "",
        "cpu": "1C",
        "memory": "2048MB",
        "storage": "20GB",
        "bandwidth": "2TB @ 1Gbps",
        "ipv4": "",
        "ipv6": "",
        "price": "$11.35",
        "paymentMethod": "年",
        "expiryDate": "2026-03-22",
        "description": "",
        "link": "",
        "country": "sg"
    }
]
```
## 🖥️ API 端点
- `GET /` - 主页面
- `GET /api/servers` - 获取服务器信息
- `GET /api/exchange-rate` - 获取汇率信息

## 📱 界面预览
系统提供两种视图模式：
1. **提供商视图** - 按服务提供商分组显示服务器
2. **所有服务器视图** - 显示所有服务器的统一列表
每个服务器卡片显示：
- 基本配置信息（CPU、内存、存储等）
- 价格信息（支持多币种，自动转换为人民币）
- 到期状态和剩余时间
- IP地址和提供商信息
## 🛠️ 技术栈
- **后端**: Node.js + Express
- **前端**: HTML5 + CSS3 + JavaScript
- **字体**: Google Fonts (Open Sans)
- **定时任务**: node-cron
- **HTTP客户端**: axios
## 🔄 自动化功能
- **定时更新**: 每日凌晨自动更新服务器状态
- **文件监控**: 自动检测 `servers.json` 变化并重新加载
- **汇率获取**: 自动获取最新的美元汇率
- **状态计算**: 自动计算服务器到期状态和剩余时间
## 🤝 贡献
欢迎提交 Issue 和 Pull Request！
1. Fork 这个项目
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request
## 📄 许可证
本项目基于 [Creative Commons Attribution-NonCommercial 4.0 International License](LICENSE) 开源，仅允许非商业用途。
详情请查看：https://creativecommons.org/licenses/by-nc/4.0/

<div align="center">
   
**如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！**
Made with ❤️ by [ZYXin](https://github.com/zyxinab)

</div>

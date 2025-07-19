const express = require('express');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const app = express();
const port = 8655;

// 全局变量
let servers = [];
let providers = [];
let filenameMap = {}; // 添加文件名到提供商名的映射
let lastUpdateTime = new Date().toISOString();
let exchangeRate = 7.2; // 默认汇率

// 辅助函数
const calculateRemainingDays = (expiryDate) => {
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }); // 获取北京时间
    const nowDate = new Date(now); // 转换为 Date 对象
    const expiry = new Date(expiryDate);
    const remainingTime = expiry - nowDate;
    const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    return remainingDays;
};

const getExchangeRate = async () => {
    try {
        // 选项1：ExchangeRate-API 主要源
        const response = await axios.get('https://v6.exchangerate-api.com/v6/5b262eb57e3c815157df1ff3/latest/USD');
        if (response.data && response.data.conversion_rates && response.data.conversion_rates.CNY) {
            console.log('使用 ExchangeRate-API 获取汇率成功');
            return response.data.conversion_rates.CNY;
        }
        throw new Error('ExchangeRate-API 数据格式错误');
    } catch (error) {
        console.error('ExchangeRate-API 获取汇率失败:', error.message);
        try {
            // 选项2：备用 ExchangeRate-API
            const backupResponse = await axios.get('https://v6.exchangerate-api.com/v6/9902fb27b49b982e677b2a1a/latest/USD');
            if (backupResponse.data && backupResponse.data.conversion_rates && backupResponse.data.conversion_rates.CNY) {
                console.log('使用备用 ExchangeRate-API 获取汇率成功');
                return backupResponse.data.conversion_rates.CNY;
            }
            throw new Error('备用 ExchangeRate-API 数据格式错误');
        } catch (backupError) {
            console.error('备用 ExchangeRate-API 也失败:', backupError.message);
            try {
                // 选项3：Frankfurter API - 另一个备用选项
                const backupResponse2 = await axios.get('https://api.frankfurter.app/latest?from=USD&to=CNY');
                if (backupResponse2.data && backupResponse2.data.rates && backupResponse2.data.rates.CNY) {
                    console.log('使用 Frankfurter API 获取汇率成功');
                    return backupResponse2.data.rates.CNY;
                }
                throw new Error('Frankfurter API 数据格式错误');
            } catch (backupError2) {
                console.error('Frankfurter API 也失败:', backupError2.message);
                return 7.2; // 默认汇率
            }
        }
    }
};

const getCountryFlag = async (ip, country) => {
    if (country) {
        return country.toLowerCase();
    }
    try {
        const response = await axios.get(`https://ipapi.co/${ip}/json/`);
        return response.data.country_code.toLowerCase();
    } catch (error) {
        console.error('获取国家信息失败:', error);
        return '未知';
    }
};

const calculateRemainingValue = async (price, paymentMethod, expiryDate) => {
    let priceValue;
    if (price === "0") {
        return "免费";
    }
    if (price.includes('￥')) {
        priceValue = parseFloat(price.replace('￥', '').replace('/月', '').replace('/年', ''));
    } else if (price.includes('$')) {
        priceValue = parseFloat(price.replace('$', '').replace('/月', '').replace('/年', '')) * exchangeRate;
    }
    const now = new Date();
    const remainingTime = new Date(expiryDate) - now;
    const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
    const totalDays = paymentMethod === '月' ? 30 : 365;
    return ((priceValue / totalDays) * remainingDays).toFixed(3) + '元'; // 增加小数位数
};

// 加载所有服务器数据
const loadAllServers = () => {
    try {
        // 首先尝试加载providers文件夹下的文件
        const providersDir = path.join(__dirname, 'providers');

        // 检查providers文件夹是否存在
        if (fs.existsSync(providersDir)) {
            // 加载提供商列表
            const providersIndexPath = path.join(providersDir, 'index.json');
            if (fs.existsSync(providersIndexPath)) {
                try {
                    const indexContent = fs.readFileSync(providersIndexPath, 'utf-8');
                    const indexData = JSON.parse(indexContent);

                    if (indexData && indexData.providers) {
                        providers = indexData.providers;
                        filenameMap = indexData.filenameMap || {}; // 加载文件名映射
                        console.log(`成功加载了 ${providers.length} 个提供商信息`);
                    } else {
                        console.error('providers/index.json 文件格式错误，缺少 providers 数组');
                        providers = [];
                        filenameMap = {};
                    }
                } catch (parseError) {
                    console.error('解析 providers/index.json 时出错:', parseError);
                    providers = [];
                    filenameMap = {};
                }
            } else {
                console.warn('提供商索引文件不存在，将创建一个空列表');
                providers = [];
                filenameMap = {};
            }

            // 加载所有提供商的服务器数据
            servers = [];
            const providerFiles = fs.readdirSync(providersDir);
            console.log(`在providers目录中找到 ${providerFiles.length} 个文件`);

            providerFiles.forEach(file => {
                if (file !== 'index.json' && file.endsWith('.json')) {
                    try {
                        const filePath = path.join(providersDir, file);
                        const fileContent = fs.readFileSync(filePath, 'utf-8');
                        const providerData = JSON.parse(fileContent);

                        if (Array.isArray(providerData)) {
                            servers = servers.concat(providerData);
                            console.log(`从 ${file} 加载了 ${providerData.length} 个服务器`);
                        } else {
                            console.error(`${file} 不包含有效的服务器数组`);
                        }
                    } catch (fileError) {
                        console.error(`读取或解析 ${file} 时出错:`, fileError);
                    }
                }
            });

            console.log(`从providers文件夹加载了 ${servers.length} 个服务器`);
        } else {
            // 如果providers文件夹不存在，则从servers.json加载
            console.log('providers文件夹不存在，从servers.json加载');
            servers = JSON.parse(fs.readFileSync(path.join(__dirname, 'servers.json'), 'utf-8'));

            // 构建提供商列表
            const groupedByProvider = {};
            servers.forEach(server => {
                const provider = server.provider;
                if (!groupedByProvider[provider]) {
                    groupedByProvider[provider] = [];
                }
                groupedByProvider[provider].push(server);
            });

            providers = Object.keys(groupedByProvider).map(name => {
                const providerServers = groupedByProvider[name];
                const activeCount = providerServers.filter(s => new Date(s.expiryDate) > new Date()).length;
                return {
                    name,
                    count: providerServers.length,
                    activeCount,
                    countries: [...new Set(providerServers.map(s => s.country))].filter(Boolean)
                };
            });
        }
    } catch (error) {
        console.error('加载服务器数据失败:', error);
        servers = [];
        providers = [];
        filenameMap = {};
    }
};

// 安全地转换文件名 - 保留中文字符，只替换不安全的字符
const safeFilename = (name) => {
    // 保留中文字符，只替换文件系统不安全的字符
    return name.replace(/[\\/:*?"<>|]/g, '_');
};

// 加载特定提供商的服务器
const loadProviderServers = (providerName) => {
    try {
        const providersDir = path.join(__dirname, 'providers');
        // 使用安全的文件名转换
        const filename = safeFilename(providerName);
        const filePath = path.join(providersDir, `${filename}.json`);

        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } else {
            console.warn(`找不到提供商 ${providerName} 的服务器数据文件`);
            return [];
        }
    } catch (error) {
        console.error(`加载提供商 ${providerName} 的服务器数据失败:`, error);
        return [];
    }
};

// 更新服务器信息
const updateServerInfo = async (serversToUpdate) => {
    exchangeRate = await getExchangeRate();
    const serversWithRemainingDaysAndValue = await Promise.all(serversToUpdate.map(async server => {
        let remainingDays = calculateRemainingDays(server.expiryDate);
        if (remainingDays < 0) remainingDays = 0;
        const remainingValue = remainingDays > 0 ? await calculateRemainingValue(server.price, server.paymentMethod, server.expiryDate) : '0元';

        // 处理IP地址和国家标志
        let ipv4 = '无';
        let ipv6 = '无';

        // 检查并获取ipv4地址
        if (Array.isArray(server.ipv4) && server.ipv4.length > 0) {
            ipv4 = server.ipv4[0]; // 使用数组的第一个元素
        } else if (typeof server.ipv4 === 'string') {
            ipv4 = server.ipv4; // 直接使用字符串值
        }

        // 检查并获取ipv6地址
        if (Array.isArray(server.ipv6) && server.ipv6.length > 0) {
            ipv6 = server.ipv6[0]; // 使用数组的第一个元素
        } else if (typeof server.ipv6 === 'string') {
            ipv6 = server.ipv6; // 直接使用字符串值
        }

        // 获取国家标志
        const countryFlag = await getCountryFlag(ipv4, server.country);

        return {
            ...server,
            days: remainingDays,
            value: remainingValue,
            countryFlag,
            ipv4: ipv4, // 使用处理后的IPv4地址
            ipv6: ipv6  // 使用处理后的IPv6地址
        };
    }));

    lastUpdateTime = new Date().toISOString();
    return serversWithRemainingDaysAndValue;
};

// 监视文件变化
const setupFileWatchers = () => {
    // 监视providers目录
    const providersDir = path.join(__dirname, 'providers');
    if (fs.existsSync(providersDir)) {
        fs.watch(providersDir, (eventType, filename) => {
            if (filename && eventType === 'change') {
                console.log(`检测到providers/${filename}文件变化，重新加载服务器信息...`);
                loadAllServers();
            }
        });
    }

    // 监视servers.json文件
    const serversJsonPath = path.join(__dirname, 'servers.json');
    if (fs.existsSync(serversJsonPath)) {
        fs.watch(serversJsonPath, (eventType, filename) => {
            if (filename && eventType === 'change') {
                console.log('检测到servers.json文件变化，重新加载服务器信息...');
                loadAllServers();
            }
        });
    }
};

// IP地址掩码处理
const maskIp = (ip) => {
    if (!ip || ip === '无') return '无';

    // 确保ip是完整的字符串，而不是单个字符
    if (typeof ip === 'string' && ip.length <= 1) return '无';

    if (ip.includes('.')) {
        // IPv4 地址掩码处理
        const parts = ip.split('.');
        return parts.map((part, index) => index < 2 ? part : 'xx').join('.');
    } else if (ip.includes(':')) {
        // IPv6 地址掩码处理
        const parts = ip.split(':');
        return parts.map((part, index) => index < 2 ? part : 'xx').join(':');
    }
    return ip;
};

// 初始化
loadAllServers();
setupFileWatchers();

// 配置Express
app.use(express.static(path.join(__dirname, 'public')));

// API路由
app.get('/api/providers', (req, res) => {
    res.json({
        providers,
        filenameMap,
        lastUpdateTime,
        exchangeRate
    });
});

app.get('/api/servers', async (req, res) => {
    let serversToSend = [...servers]; // 默认发送所有服务器

    // 如果指定了提供商，则只发送该提供商的服务器
    if (req.query.provider) {
        serversToSend = loadProviderServers(req.query.provider);
    }

    // 更新服务器信息
    const updatedServers = await updateServerInfo(serversToSend);

    // 分类为活跃和过期
    const activeServers = updatedServers.filter(server => server.days > 0).map(server => ({
        ...server,
        ipv4: maskIp(server.ipv4),
        ipv6: maskIp(server.ipv6)
    }));
    const expiredServers = updatedServers.filter(server => server.days === 0).map(server => ({
        ...server,
        ipv4: maskIp(server.ipv4),
        ipv6: maskIp(server.ipv6)
    }));

    res.json({
        activeServers,
        expiredServers,
        lastUpdateTime,
        exchangeRate,
        provider: req.query.provider || 'all'
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log('正在加载服务器数据...');
    loadAllServers();

    // 验证数据加载成功
    console.log(`成功加载了 ${providers.length} 个提供商和 ${servers.length} 个服务器`);

    // 启动时更新一次服务器信息
    updateServerInfo(servers).then((updatedServers) => {
        console.log(`完成了 ${updatedServers.length} 个服务器的信息更新`);
    }).catch(err => {
        console.error('更新服务器信息时出错:', err);
    });
});

// 设置定时任务，每小时更新服务器信息
cron.schedule('0 * * * *', () => {
    console.log('开始更新服务器信息...');
    updateServerInfo(servers).then(() => {
        console.log('服务器信息更新完成');
    }).catch(err => {
        console.error('更新服务器信息时出错:', err);
    });
});

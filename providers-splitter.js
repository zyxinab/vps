const fs = require('fs');
const path = require('path');

// 读取源JSON文件
const serversData = JSON.parse(fs.readFileSync(path.join(__dirname, 'servers.json'), 'utf-8'));

// 创建providers文件夹（如果不存在）
const providersDir = path.join(__dirname, 'providers');
if (!fs.existsSync(providersDir)) {
    fs.mkdirSync(providersDir);
}

// 按照提供商分组
const groupedByProvider = {};
serversData.forEach(server => {
    const provider = server.provider;
    if (!groupedByProvider[provider]) {
        groupedByProvider[provider] = [];
    }
    groupedByProvider[provider].push(server);
});

// 安全地转换文件名 - 保留中文字符，只替换不安全的字符
const safeFilename = (name) => {
    // 保留中文字符，只替换文件系统不安全的字符
    return name.replace(/[\\/:*?"<>|]/g, '_');
};

// 创建文件名到提供商名称的映射
const filenameMap = {};

// 创建提供商列表文件
const providersList = Object.keys(groupedByProvider).map(name => {
    const servers = groupedByProvider[name];
    const activeCount = servers.filter(s => new Date(s.expiryDate) > new Date()).length;

    // 为每个提供商生成安全的文件名
    const filename = safeFilename(name);
    filenameMap[filename] = name;

    return {
        name,
        filename,  // 添加文件名属性
        count: servers.length,
        activeCount,
        countries: [...new Set(servers.map(s => s.country))].filter(Boolean)
    };
});

// 写入提供商列表文件，包含文件名映射
fs.writeFileSync(
    path.join(providersDir, 'index.json'),
    JSON.stringify({
        providers: providersList,
        filenameMap
    }, null, 4)
);

// 为每个提供商创建单独的JSON文件
Object.entries(groupedByProvider).forEach(([provider, servers]) => {
    const filename = safeFilename(provider);
    fs.writeFileSync(
        path.join(providersDir, `${filename}.json`),
        JSON.stringify(servers, null, 4)
    );
    console.log(`创建了提供商文件: ${filename}.json, 包含 ${servers.length} 个服务器`);
});

console.log(`成功将 ${serversData.length} 个服务器拆分到 ${Object.keys(groupedByProvider).length} 个提供商文件中`);
console.log(`提供商列表已保存到 providers/index.json`);

// 确保服务器重新加载数据
console.log('重启服务器以加载新的提供商数据...');

const fs = require('fs');
const path = require('path');

/**
 * electron-builder afterPack hook
 * 确保 server 目录和 node_modules 被正确复制到打包应用中
 */
exports.default = async function(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  
  console.log('=== afterPack Hook ===');
  console.log('Platform:', electronPlatformName);
  console.log('Output directory:', appOutDir);
  
  // 源 server 目录
  const sourceServerDir = path.join(packager.projectDir, 'server');
  
  // 目标路径根据平台不同
  let targetServerDir;
  
  if (electronPlatformName === 'darwin') {
    // macOS: .app/Contents/Resources/server
    const appName = `${packager.appInfo.productName}.app`;
    targetServerDir = path.join(appOutDir, appName, 'Contents', 'Resources', 'server');
  } else if (electronPlatformName === 'win32') {
    // Windows: resources/server
    targetServerDir = path.join(appOutDir, 'resources', 'server');
  } else if (electronPlatformName === 'linux') {
    // Linux: resources/server
    targetServerDir = path.join(appOutDir, 'resources', 'server');
  }
  
  console.log('Source server dir:', sourceServerDir);
  console.log('Target server dir:', targetServerDir);
  
  // 检查源目录
  if (!fs.existsSync(sourceServerDir)) {
    console.error('ERROR: Source server directory does not exist!');
    return;
  }
  
  // 检查 node_modules
  const sourceNodeModules = path.join(sourceServerDir, 'node_modules');
  if (!fs.existsSync(sourceNodeModules)) {
    console.error('ERROR: server/node_modules does not exist!');
    console.error('Please run: cd server && npm ci --only=production');
    return;
  }
  
  console.log('✓ Source server directory exists');
  console.log('✓ Source node_modules exists');
  
  // 确保目标目录存在
  if (!fs.existsSync(targetServerDir)) {
    console.log('Creating target directory...');
    fs.mkdirSync(targetServerDir, { recursive: true });
  }
  
  // 复制 server 目录内容（包括 node_modules）
  console.log('Copying server directory...');
  copyRecursiveSync(sourceServerDir, targetServerDir);
  
  // 验证复制结果
  const targetNodeModules = path.join(targetServerDir, 'node_modules');
  if (fs.existsSync(targetNodeModules)) {
    const modules = fs.readdirSync(targetNodeModules);
    console.log(`✓ node_modules copied successfully (${modules.length} packages)`);
    console.log('Sample packages:', modules.slice(0, 10).join(', '));
  } else {
    console.error('ERROR: node_modules was not copied!');
  }
  
  console.log('=== afterPack Complete ===');
};

/**
 * 递归复制目录
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      // 跳过日志和 PID 文件
      if (childItemName === 'server-local.log' || childItemName === 'server-local.pid') {
        return;
      }
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

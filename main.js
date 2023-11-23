// farmFree - 23.11.23
auto();

if (!auto.service) {
  toast('无障碍服务未启动！退出！')
  exit();
}

function getSetting() {
  let indices = []
  taobaoOpen && indices.push(0)
  payOpen && indices.push(1)
  furOpen && indices.push(2)
  indices.push(3)

  let settings = dialogs.multiChoice('任务设置',
    ['自动打开淘宝进入活动。',
      '自动打开支付宝进入活动。',
      '是否自动施肥',
      '请在运行之前退出正在运行的淘宝和支付宝，否则可能找不到对应页面(此选项用于保证选择的处理，勿动！)'
    ], indices)

  if (settings.length == 0) {
    toast('取消选择，任务停止')
    exit()
  }

  if (settings.indexOf(0) != -1) {
    storage.put('taobaoOpen', true)
    taobaoOpen = true
  } else {
    storage.put('taobaoOpen', false)
    taobaoOpen = false
  }
  if (settings.indexOf(1) != -1) {
    storage.put('payOpen', true)
    payOpen = true
  } else {
    storage.put('payOpen', false)
    payOpen = false
  }
  if (settings.indexOf(2) != -1) {
    storage.put('furOpen', true)
    furOpen = true
  } else {
    storage.put('furOpen', false)
    furOpen = false
  }
}

let storage = storages.create("tb_task");
let taobaoOpen = storage.get('taobaoOpen', true)
let payOpen = storage.get('payOpen', true)
let furOpen = storage.get('furOpen', true)

/**
 * 初始化配置
 * 选择淘宝或者支付宝任务
 * 自动施肥选项
 */
function initEnv() {
  console.show();
  sleep(1000);
  console.setSize(device.width / 2, 300);
  console.setPosition(10, 10);
  getSetting();
}

initEnv();

// 静音
try {
  device.setMusicVolume(0)
  toast('成功设置媒体音量为0')
} catch (err) {
  alert('首先需要开启权限，请开启后再次运行脚本')
  exit()
}

// 适配设备宽度 - 不确定是否真的生效
setScreenMetrics(1080, 2340);
// 屏幕常亮
device.keepScreenDim(60 * 60 * 1000);

// 自定义去取消亮屏的退出方法
function quit() {
  device.cancelKeepingAwake()
  exit();
}

// findTimeout查找器，主要是为了批量查找
function findTimeout(findF, timeout) {
  let c = 0
  while (c < timeout / 50) {
    let result = findF.find();
    if (result.nonEmpty()) {
      return result
    }
    sleep(50);
    c++;
  }
  return null
};

// 返回任务列表
function backToTaoList() {
  if (className("android.widget.TextView").text("x500").exists()) {
    console.log('已在任务列表');
    return;
  }
  if (className("android.widget.Button").text("集肥料").exists()) {
    className("android.widget.Button").text("集肥料").findOne().click();
    console.log('已经在芭芭农场，重新打开任务列表');
    return;
  }
  back();
  sleep(1000);
  if (currentPackage() !== 'com.taobao.taobao') {
    console.log('当前不在淘宝APP内');
    sleep(2000);
    app.launch("com.taobao.taobao");
    sleep(4000);
    if (className("android.widget.Button").text("集肥料").exists()) {
      console.log('已在农场，重新进入任务列表');
      className("android.widget.Button").text("集肥料").findOne().click();
      sleep(2000);
      return;
    }

    let retryTime = 0;
    let success = false;
    while (retryTime < 5) {
      // 重进后尝试返回一次
      back();
      sleep(1000);
      if (className("android.widget.TextView").text("x500").exists()) {
        console.log('已在任务列表');
        success = true;
        retryTime = 10;
        return;
      }
      if (className("android.widget.Button").text("集肥料").exists()) {
        console.log('已在农场，重新进入任务列表');
        className("android.widget.Button").text("集肥料").findOne().click();
        sleep(2000);
        success = true;
        retryTime = 10;
        return;
      }
      retryTime++;
      if (currentPackage().includes('taobao')) {
        enterFarmTaobao();
      }
      if (className("android.widget.Button").text("集肥料").exists()) {
        console.log('已在农场，重新进入任务列表');
        className("android.widget.Button").text("集肥料").findOne().click();
        sleep(2000);
        success = true;
        retryTime = 10;
        return;
      }
    }
    if (!success) {
      console.error('不能正确识别页面，异常退出');
      quit();
    }

  } else {
    // 如果还在端内
    // 判断一下是不是回来了
    if (className("android.widget.TextView").text("x500").exists()) {
      console.log('成功返回任务列表');
      return;
    }
    // 没有的话只能再返回试一下 - 搜索任务就是这种情况
    back();
    sleep(1000);
  }
}

// 从首页进入任务 - 比较特殊，单独处理一下
function entryHome() {
  if (className("android.widget.TextView").text("从首页进入芭芭农场(0/1)").exists()) {
    className("android.widget.TextView").text("从首页进入芭芭农场(0/1)").findOne().parent().parent().click();
    sleep(3000);
    // ?无法点击
    const res = findTimeout(className("android.view.View").clickable(true).depth(13), 5000);
    if (res) {
      res.forEach(function (item) {
        // item.click();
        console.log(item.bounds().centerX(), item.bounds().centerY());
        click(item.bounds().centerX(), item.bounds().centerY());
      });
      return;
    }
  }
  console.log('没有找到首页进入任务');
}

// 淘宝浏览任务 自调用直到所有的任务完成
function startTaobaoBrowseTask() {
  const searchTaks = findTimeout(className("android.widget.TextView").textContains("浏览15秒得"), 5000);
  if (searchTaks === null) {
    console.log('未找到浏览任务');
    closeOpenModal();
    return;
  }
  searchTaks.forEach(function (task) {
    console.log("开始浏览任务");
    task.click();
    sleep(2000);
    let finish_c = 0;
    let countdown = 0;
    while (finish_c < 36) {
      // 如果是搜索
      if (className("android.widget.TextView").text("猜你想搜").exists()) {
        const b = className("android.view.View").depth(11).findOne().bounds();
        click(b.centerX(), b.centerY());
        sleep(2000);
        continue;
      }
      let finish_reg = /.*任务完成.*|.*下单最高可得[\s\S]*|.*当前页下单得*|.*浏览完成*/;
      if (className("android.widget.TextView").textMatches(finish_reg).exists()) {
        console.log('任务完成');
        break;
      }
      if (finish_c && !text('更多直播').exists() && !text('视频').exists()) {
        // console.log('滑动防止页面卡顿')
        swipe(device.width / 2, device.height - 300, device.width / 2 + 20, device.height - 500, 1000)
        finish_c = finish_c + 2;
        continue;
      }
      finish_c++;
    }
    if (finish_c > 35) {
      console.log('未检测到任务完成标识。返回。');
      backToTaoList();
      return
    }
    backToTaoList();
  });
  startTaobaoBrowseTask();
}

/** 
 * 淘宝互动任务
 * 淘宝的每个任务都很特殊，需要单独处理
*/
const actClickTime = {};
function startActTask(params) {
  entryHome();
  sleep(1000);
  const actTaks = findTimeout(className("android.widget.Button").textContains("去完成"), 5000);
  const retryFailTasks = Object.values(actClickTime).filter(i => i > 1).length;
  if (actTaks === null) {
    console.log('未找到互动任务');
    backToTaoList();
    return;
  }
  if (actTaks.length === retryFailTasks) {
    console.log('剩余任务可能无法完成，请手动完成');
    backToTaoList();
    return;
  }
  actTaks.forEach(function (act) {
    act.click();
    const b = act.bounds();
    actClickTime[b.centerY()] = (actClickTime[b.centerY()] || 0) + 1;
    if (actClickTime[b.centerY()] > 1) {
      console.log("已经点击但任务未完成，本次跳过");
      return;
    }
    sleep(10000);
    backToTaoList();
  });
  // 再进一次
  startActTask();
}

// 兔兔和施肥奖励收集 —— canvas元素，只能靠坐标尝试点击一下
function collect() {
  console.log('尝试收集肥料...');
  const taskBtn = className('android.widget.Button').text('集肥料').findOne();
  if (taskBtn) {
    const btnRect = taskBtn.bounds();
    // 只有在屏幕范围内才能生效，否则bottom是屏幕高度
    const itemHeight = btnRect.bottom - btnRect.top;
    click(device.width - 60, btnRect.centerY() - (itemHeight * 2));
    sleep(1000);
    // 关闭签到的弹窗
    closeOpenModal();
    click(60, btnRect.centerY() - (itemHeight * 2));
    sleep(1000);
  } else {
    console.log('没有找到集肥料按钮，定位失败')
  }
}

// 签到
function sign() {
  console.log("开始签到");
  const res = className("android.widget.Button").text("去签到");

  if (res.exists()) {
    res.findOne().click();
    sleep(2000);
  }
  console.log("签到结束或已签到");
  // 早午晚任务
  getBtnClick();
}

// 定时任务领取
function getBtnClick() {
  console.log("开始领取");
  const btns = findTimeout(className("android.widget.Button").text("去领取"), 5000);
  if (btns === null) {
    console.log('未找到任务')
    return;
  }
  btns.forEach(function (btn) {
    btn.click();
    sleep(2000);
  });
  console.log("定时任务已领取");
  sleep(1000);
}

// 关闭弹窗
function closeOpenModal(duration) {
  const res = findTimeout(className("android.widget.Button").text("关闭").clickable(true), duration || 5000);
  if (res === null) {
    console.log('未找到关闭弹窗');
    return;
  }
  console.log('尝试关闭弹窗');
  res.forEach(function (item) {
    item.click();
    sleep(1200);
  });
  sleep(2000);
}

// 淘宝开始施肥
function fertilizerTaobao() {
  let loop = true;
  const btnRect = className('android.widget.Button').text('集肥料').findOne().bounds();
  const itemHeight = btnRect.bottom - btnRect.top;
  console.log("开始施肥");
  while (loop) {
    closeOpenModal(1000);
    // 施肥
    click(device.width / 2, btnRect.centerY());
    if (textContains("今天施肥次数用完啦").exists()) {
      console.log("今日施肥已达上限")
      loop = false;
    }
    sleep(500);
    // 尝试收集奖励，会有弹窗，因此同时需要检测并关闭
    click(device.width / 2,btnRect.centerY() - (itemHeight * 2));
    sleep(500);
  }
  return;
}

function enterFarmTaobao(params) {
  if (text('芭芭农场').exists()) {
    let rect = text('芭芭农场').findOne(2000).bounds();
    let x = rect.centerX();
    let y = rect.centerY();
    if (x > device.width) {
      console.info('超出屏幕，尝试滑动寻找');
      swipe(device.width / 1.2, y, 200, y, 500);
      sleep(200);
    } else {
      click(x, y);
      return;
    }
    console.info('重新定位中');
    // 滑动之后还有的话，重新定位
    if (text('芭芭农场').exists()) {
      rect = text('芭芭农场').findOne(2000).bounds();
      x = rect.centerX();
      y = rect.centerY();
      console.log("重新定位结果>>>", x, y);
      // 在屏幕中才可以点击
      if (x < device.width) {
        console.info('重新定位成功');
        click(x, y);
        return;
      }
    }
  }
  // 尝试从我的页面进入
  if (className("android.widget.FrameLayout").desc("我的淘宝").exists()) {
    className("android.widget.FrameLayout").desc("我的淘宝").findOne().click();
    sleep(2000);
    className("android.widget.FrameLayout").desc("芭芭农场").findOne().click();
    sleep(5000);
  }

}

// 处理亲密度弹窗——这个弹窗有点特殊，可能在任何时机弹出来，不好搞，开始的时候先处理一下这个弹窗
function closeShip(params) {
  console.log('开始处理亲密度弹窗');
  if (className("android.widget.Button").text("关闭").exists()) {
    className("android.widget.Button").text("关闭").findOne().click();
    sleep(1200);
  } else {
    console.log('未参与合种或者未找到亲密度弹窗');
  }
}

function startTaobao(params) {
  app.launchApp("淘宝");
  sleep(5000);

  try {
    enterFarmTaobao();
    closeOpenModal();
    collect();
    // className('android.widget.Button').text('集肥料').findOne().click();
    // sleep(3000);
    // sign();
    // // 开始浏览任务
    // startTaobaoBrowseTask();
    // backToTaoList();
    // // 开始互动任务
    // startActTask();
    if (furOpen) {
      console.info('开始自动施肥');
      fertilizerTaobao();
    } else {
      console.info('未选择自动施肥，已跳过');
    }

    if (payOpen) {
      console.log('淘宝任务结束，开始支付宝任务');
    } else {
      console.log('淘宝任务结束');
    }
  } catch (error) {
    console.error('异常退出', error)
  }
}

// 开始淘宝任务
if (taobaoOpen) {
  startTaobao();
}

/**
 * 开始支付宝任务
 * >>>>>>>>>>
 * >>>>>>>>>>
 */

// 支付宝进入农场
function enterFarm() {
  console.log('进入农场');
  if (text("芭芭农场").exists()) {
    text("芭芭农场").findOne().parent().parent().click();
  } else {
    throw Error('未在首页找到芭芭农场入口，请将芭芭农场小程序移动到支付宝首页显示');
  }
  sleep(3000);
}

// 返回支付宝任务详情
function backToPayList() {
  console.log('尝试返回');

  // 已经打开任务列表了
  if (className("android.widget.Button").text("连续签到任务规则").exists()) {
    console.log('当前已在任务列表，不再返回');
    return;
  };
  if (className("android.widget.Button").text("任务列表").exists()) {
    className("android.widget.Button").text("任务列表").findOne().click();
    console.log('已经在芭芭农场，重新打开任务列表')
    return;
  }
  back();
  sleep(1000);
  if (!currentPackage().includes('Alipay')) {
    console.log('当前不在支付宝中，尝试重新进入...');
    sleep(2000);
    app.launch("com.eg.android.AlipayGphone");
    sleep(2000);
    if (className("android.widget.Button").text("任务列表").exists()) {
      console.log('已在农场，重新进入任务列表');
      className("android.widget.Button").text("任务列表").findOne().click();
      sleep(2000);
      return;
    }

    let retryTime = 0;
    let success = false;
    while (retryTime < 5) {
      // 重进后尝试返回一次
      back();
      sleep(500);
      retryTime++;
      const res = className("android.widget.TextView").text("首页").findOne(2000);
      // 如果存在首页，则进入
      if (res) {
        console.info('当前不在支付宝首页，尝试进入首页')
        // res.click();
        res.parent().click()
        sleep(2000);
        enterFarm();
        className("android.widget.Button").text("任务列表").findOne().click();
        retryTime = 10;
        success = true;
        sleep(2000);
        return;
      } else if (text("芭芭农场").exists()) {
        console.log('直接进入芭芭农场')
        enterFarm();
        className("android.widget.Button").text("任务列表").findOne().click();
        retryTime = 10;
        success = true;
        sleep(2000);
        return;
      }

      if (className("android.widget.Button").text("任务列表").exists()) {
        console.log('已在农场，重新进入任务列表');
        className("android.widget.Button").text("任务列表").findOne().click();
        sleep(2000);
        retryTime = 10;
        success = true;
        return;
      }
    }
    if (!success) {
      console.error('不能正确识别页面，异常退出');
      quit();
    }
  } else {
    // 已经打开任务列表了
    if (className("android.widget.Button").text("连续签到任务规则").exists()) {
      console.log('当前已在任务列表，不再返回');
      return;
    };
    if (className("android.widget.Button").text("任务列表").exists()) {
      className("android.widget.Button").text("任务列表").findOne().click();
      console.log('已经在芭芭农场，重新打开任务列表')
      return;
    }
    console.log('仍然在支付宝中，但不在芭芭农场页面');
    let retryTime = 0;
    let success = false;
    while (retryTime < 5) {
      // 重进后尝试返回一次
      back();
      sleep(500);
      retryTime++;
      const home = className("android.widget.TextView").text("首页").findOne(2000);
      // 如果存在首页，则进入
      if (home) {
        console.info('当前不在支付宝首页，尝试进入首页')
        home.parent().click()
        sleep(2000);
        enterFarm();
        className("android.widget.Button").text("任务列表").findOne().click();
        retryTime = 10;
        success = true;
        sleep(2000);
        return;
      } else if (text("芭芭农场").exists()) {
        console.log('直接进入芭芭农场')
        enterFarm();
        className("android.widget.Button").text("任务列表").findOne().click();
        retryTime = 10;
        success = true;
        sleep(2000);
        return;
      }

      if (className("android.widget.Button").text("任务列表").exists()) {
        console.log('已在农场，重新进入任务列表');
        className("android.widget.Button").text("任务列表").findOne().click();
        sleep(2000);
        retryTime = 10;
        success = true;
        return;
      }
    }
    if (!success) {
      console.error('不能正确识别页面，异常退出');
      quit();
    }
  }
}

/**
 * 开始支付宝浏览任务
 * 支付宝比较奇怪，没法通过元素反查父元素，面板里所有的元素都同级。
 * 只能通过position去尝试定位一下
 */
function startAlipaybrowse() {
  const res = findTimeout(className("android.widget.TextView").textMatches(/.*浏览15.*|.*浏览精选好物.*/), 5000);
  if (res === null) {
    console.log('未找到浏览任务');
    return;
  }
  let allDone = true;
  res.forEach(function (item) {
    const btn = boundsInside(item.bounds().right, item.bounds().bottom - ((item.bounds().bottom - item.bounds().top) * 3), device.width, item.bounds().bottom).className("android.widget.Button").textMatches(/.*去完成.*|.*去逛逛.*/).findOne(2000);
    if (btn) {
      allDone = false;
      btn.click();
      sleep(4000);
      let finish_c = 0;
      let countdown = 0;
      console.log('开始检测任务完成，部分控件无法检测，会在15秒后自动返回，请耐心等待。')
      while (finish_c < 36) {
        let finish_reg = /.*任务完成.*|.*下单最高可得[\s\S]*|.*当前页下单得*|.*浏览完成*/;
        if (className("android.widget.TextView").textMatches(finish_reg).exists()) {
          console.log('任务完成');
          break;
        }
        if (finish_c && !text('更多直播').exists() && !text('视频').exists()) {
          swipe(device.width / 2, device.height - 300, device.width / 2 + 20, device.height - 500, 1000)
          finish_c = finish_c + 2;
          continue;
        }
        finish_c++;
      }
      if (finish_c > 35) {
        console.log('未检测到任务完成标识。返回。');
        backToPayList();
        return
      }
      backToPayList();
    }
  });
  // 某次执行没有任何可浏览按钮的话，则退出
  if (allDone) {
    console.log('浏览任务完成');
    return;
  }
  startAlipaybrowse();
}

// 按照坐标记录重试的点位次数——有个问题，但是浏览任务在同一个坑位确实会刷新出新的任务
/**
 * 支付宝的互动任务按钮没有区分只能按照全量查找了
 */
const btnClickTime = {};
function startAlipayAct() {
  // 找到这个任务的Y位置，这个任务不可完成并且会在当前的页面出弹窗，需要排除
  let gameTextRect
  let gameText = className("android.widget.TextView").textMatches(/.*去玩游戏得砸蛋机会.*/).findOne(1000);
  if (gameText) {
    gameTextRect = gameText.bounds();
  }
  const allNotSupportTask = findTimeout(className("android.widget.TextView").textMatches(/.*砸蛋.*|.*落叶.*|.*下单.*|.*饿了么.*/), 2000);
  let allNotSupportTaskLength = 0;
  if (allNotSupportTask) {
    console.log('共找到不可完成任务：', allNotSupportTask.length);
    allNotSupportTaskLength = allNotSupportTask.length;
  }
  const res = findTimeout(className("android.widget.Button").clickable(true).textMatches(/.*去完成.*|.*去逛逛.*/).enabled(true), 7000);
  const retryFailTasks = Object.values(btnClickTime).filter(i => i > 1).length;
  if (res === null) {
    console.log('未找到更多任务');
    return;
  }
  if ((res.length <= retryFailTasks) &&
    (!allNotSupportTaskLength
      || (allNotSupportTaskLength && res.length <= allNotSupportTaskLength))) {
    console.log("剩余任务可能均不能完成，请手动完成");
    return;
  }
  res.forEach((item, index) => {
    const b = item.bounds();
    btnClickTime[b.centerY()] = (btnClickTime[b.centerY()] || 0) + 1;
    if (btnClickTime[b.centerY()] > 1) {
      console.log("已经点击但任务未完成，本次跳过");
      return;
    }
    // 点击之前要先排除掉不可完成的任务
    if (gameTextRect && (b.top - 50 < gameTextRect.top) && (b.top + 50 > gameTextRect.top)) {
      console.log("砸金蛋任务不可完成，跳过");
      return;
    }
    item.click();
    sleep(1800);
    if (className("android.widget.Button").text("任务列表").exists()) {
      console.log('任务跳转失败，仍在任务列表中，跳过');
      return;
    }
    if (textContains('森林').exists()) {
      console.log('蚂蚁森林页面，跳过');
      backToPayList();
      return;
    }
    let finish_c = 0;
    let countdown = 0;
    console.log('开始检测任务完成，部分控件无法检测，会在15秒后自动返回，请耐心等待。')
    while (finish_c < 36) {
      let finish_reg = /.*任务完成.*|.*下单最高可得[\s\S]*|.*当前页下单得*|.*浏览完成*/;
      if (className("android.widget.TextView").textMatches(finish_reg).exists()) {
        console.log('任务完成');
        break;
      }
      if (finish_c && !text('更多直播').exists() && !text('视频').exists()) {
        swipe(device.width / 2, device.height - 300, device.width / 2 + 20, device.height - 500, 1000)
        finish_c = finish_c + 2;
        continue;
      }
      finish_c++;
    }
    if (finish_c > 35) {
      console.log('未检测到任务完成标识。返回。');
      backToPayList();
      return
    }
    backToPayList();
  });
  gatherFur();
  startAlipayAct();
}

function gatherFur(params) {
  const res = findTimeout(className('android.widget.Button').text('领取'), 5000);
  if (res === null) {
    console.log('未找到任务');
    return;
  }
  console.log('领取肥料')
  res.forEach(function (item) {
    item.click();
    sleep(1000);
  });
  console.log('领取完成');
}

const fertilizerAlipay = function () {
  closeOpenModal();
  const res = className('android.widget.Button').text('任务列表').findOne(2000);
  if (res) {
    const x = res.bounds().centerX();
    const y = res.bounds().centerY();

    // 相对坐标找签到领取
    click();
    sleep(1000);

    let loop = true;
    while (loop) {
      // click(x, y-300)
      // 施肥
      click(device.width / 2, y);
      if (textMatches(/.*施肥次数.*用完.*/).exists()) {
        console.log("今日施肥已达上限")
        loop = false;
      }
      sleep(500);
    }
    return;
  } else {
    console.error('当前不在任务列表中，无法自动施肥');
  }

}

function startAlipay() {
  app.launch("com.eg.android.AlipayGphone");

  try {
    sleep(5000);

    // 进入农场
    if (text("芭芭农场").exists()) {
      enterFarm();
      sleep(5000);
      // 打开任务面板
      className("android.widget.Button").text("任务列表").findOne().click();
      sleep(2000);
      gatherFur();
      startAlipaybrowse();
      sleep(2000);
      // 开始任务
      startAlipayAct();
      // 支付宝施肥
      if (furOpen) {
        console.info('开始自动施肥');
        fertilizerAlipay();
      } else {
        console.info('未选择自动施肥，已跳过');
      }
    }

    console.info('全部任务已经结束~如有问题请联系开发者');
  } catch (error) {
    console.error('异常退出', error)
  }
}
if (payOpen) {
  startAlipay();
}

quit();




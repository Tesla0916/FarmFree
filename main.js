// farmFree - 23.11.23
auto();

if (!auto.service) {
  toast('无障碍服务未启动！退出！')
  exit();
}

function userChoice() {
  let indices = []
  taobaoOpen && indices.push(0)
  payOpen && indices.push(1)
  furOpen && indices.push(2)
  indices.push(3)

  let settings = dialogs.multiChoice('任务设置',
    ['开始淘宝任务',
      '开始支付宝任务',
      '自动施肥(至少勾选支付宝或者淘宝中的一项，如果都选择了，将优先在淘宝任务结束后执行)',
      '请确认已退出淘宝和支付宝。可以通过按【音量下】键停止脚本任务'
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
  userChoice();
}

initEnv();

// 静音
try {
  device.setMusicVolume(0)
  toast('成功设置媒体音量为0')
} catch (err) {
  alert('首先需要开启权限，请开启后再次运行脚本')
  exit();
}

// 配置
function listenKeyDown() {
  try {
    events.observeKey()
  } catch (err) {
    console.log('监听音量键停止失败，应该是无障碍权限出错，请关闭软件后台任务重新运行。')
    console.log('如果还是不行可以重启手机尝试。')
    quit();
  }
  events.onKeyDown('volume_down', function (event) {
    console.log('监听到任务变更，已停止任务');
    quit();
  })
}
threads.start(listenKeyDown);

// 适配设备宽度 - 不确定是否真的生效
setScreenMetrics(1080, 2340);
// 屏幕常亮
device.keepScreenDim(60 * 60 * 1000);

// 自定义去取消亮屏的退出方法
function quit() {
  device.cancelKeepingAwake();
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

// 判断是否成功返回了任务列表|直接就在
const isTaoBackSuccess = () => {
  if (className("android.widget.TextView").text("x500").exists()) {
    console.log('已在任务列表');
    return true;
  }
  if (className("android.widget.Button").text("集肥料").exists()) {
    className("android.widget.Button").text("集肥料").findOne().click();
    console.log('已经在芭芭农场，重新打开任务列表');
    return true;
  }
  return false;
}

// 返回任务列表
function backToTaoList() {
  // 如果还在任务列表则不需要返回动作
  if (isTaoBackSuccess()) {
    return;
  }
  back();
  sleep(1000);
  // 不再淘宝内，重新打开
  if (currentPackage() !== 'com.taobao.taobao') {
    console.warn('当前不在淘宝APP内');
    sleep(2000);
    app.launch("com.taobao.taobao");
    sleep(4000);
    // 同样，启动之后直接判断一下是否在任务列表
    if (isTaoBackSuccess()) {
      return;
    }

    let retryTime = 0;
    let success = false;
    // 持续back重试，一般5次之内应该能回来
    while (retryTime < 5) {
      // 重进后尝试返回一次
      back();
      sleep(1000);
      // 如果某次循环中，已经返回到任务列表了，则停止重试
      if (isTaoBackSuccess()) {
        success = true;
        retryTime = 10;
        return;
      }
      retryTime++;
    }
    // 超出重试次数之后仍然没有成功进入，如果此时已经返回了taobao
    if (currentPackage() === 'com.taobao.taobao') {
      // 尝试一下是否有入口能进入farm，能进就进，只是一个兜底，一般来说都能直接back回去
      enterFarmTaobao();
    }
    // 如果能重新进入到任务列表中
    if (isTaoBackSuccess()) {
      return;
    }
    // 错误，页面异常退出
    // TODO: 还有招，直接activity进入，但是可能页头之类的元素会有问题。。。定位相关的动作会失败
    if (!success) {
      console.error('不能正确识别页面，异常退出');
      quit();
    }

  } else {
    // 如果还在端内，判断一下是不是回来了，正常的浏览任务或者端内跳转的都适用与这个逻辑
    if (className("android.widget.TextView").text("x500").exists()) {
      console.log('成功返回任务列表');
      return;
    }
    // 没有的话只能再返回试一下 - 搜索任务就是这种情况
    back();
    sleep(1000);
    // TODO:  这里不太严谨，也应该循环判断一下的，不过端内目前没发现很奇葩的场景，先不追究
  }
}

// 从首页进入任务 - 比较特殊，单独处理一下
function entryHome() {
  if (className("android.widget.TextView").text("从首页进入芭芭农场(0/1)").exists()) {
    className("android.widget.TextView").text("从首页进入芭芭农场(0/1)").findOne().parent().parent().click();
    sleep(3000);
    // ?无法点击，发现每次进入的层级可能都不一样
    const res = findTimeout(className("android.view.View").clickable(true).depth(13), 5000);
    if (res) {
      res.forEach(function (item) {
        // item.click();
        console.log('尝试点击>>', item.bounds().centerX(), item.bounds().centerY());
        click(item.bounds().centerX(), item.bounds().centerY());
      });
      return;
    }
  }
  console.log('没有找到首页进入任务');
}

// 淘宝浏览任务 自调用直到所有的任务完成
function startTaobaoBrowseTask() {
  const searchTaks = findTimeout(className("android.widget.TextView").textMatches(/.*浏览15秒得.*|.*搜一搜你心仪的宝贝.*/), 5000);
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
      console.log('任务执行超时，自动返回');
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
    console.log('剩余任务可能无法完成，请手动完成或者尝试再次运行程序');
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
    console.log("签到结束");
    sleep(2000);
  }
  // 早午晚任务
  getBtnClick();
}

// 定时任务领取
function getBtnClick() {
  console.log("开始自动领取");
  const btns = findTimeout(className("android.widget.Button").text("去领取"), 5000);
  if (btns === null) {
    console.log('未找到定时任务')
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
    if (!duration) {
      console.log('未找到关闭弹窗');
    }
    return;
  }

  console.log('有弹窗，尝试关闭弹窗');
  res.forEach(function (item) {
    item.click();
    sleep(1200);
  });
  sleep(2000);
}

// 淘宝开始施肥
function fertilizerTaobao() {
  let loop = true;
  let fbtn = className('android.widget.Button').text('集肥料').findOne();
  if (!fbtn) {
    console.error('没有找到自动施肥按钮，尝试重新进入农场中...');
    backToTaoList();
    fbtn = className('android.widget.Button').text('集肥料').findOne();
    // 重试之后还是找不到，提示失败
    if (!fbtn) {
      console.error('自动施肥失败');
      return;
    }
  }
  const btnRect = fbtn.bounds();
  const itemHeight = btnRect.bottom - btnRect.top;
  console.log("开始施肥");
  const clickTimes = 0;
  while (loop && clickTimes < 220) {
    clickTimes++;
    closeOpenModal(1000);
    // 施肥
    click(device.width / 2, btnRect.centerY());
    if (textContains("今天施肥次数用完啦").exists()) {
      console.log("今日施肥已达上限")
      loop = false;
    }
    sleep(500);
    // 尝试收集奖励，会有弹窗，因此同时需要检测并关闭
    click(device.width / 2, btnRect.centerY() - (itemHeight * 2));
    sleep(500);
  }
  if (clickTimes >= 220) {
    console.log('检测任务结束异常，达到最大施肥次数，已停止');
    return
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
      swipe(device.width - 100, y, 100, y, 500);
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

/**
 * 处理淘宝亲密度弹窗
 * @desc 这个弹窗有点特殊，可能在任何时机弹出来，不好搞，
 * 开始的时候先处理一下这个弹窗，领取完成了就不会再弹出了，
 * 如果在施肥的过程中亲密度增加了，也有关闭弹窗的逻辑去处理，DW
 */
function endFriendship(params) {
  console.log('开始处理亲密度弹窗');
  const cBtn = className("android.widget.Button").textMatches(/.*合种加速百分之.*/).findOne(1000);
  if (cBtn) {
    cBtn.click();
    sleep(1200);
    // 如果打开了亲密度弹窗
    if (className("android.widget.Image").text("合种亲密度").exists()) {
      const res = findTimeout(className("android.widget.Button").text("立即领取").depth(18).clickable(true), 2000);
      if (res) {
        res.forEach(function (item) {
          item.click();
          sleep(1500);
        });
        console.log('亲密度肥料领取完成');
        closeOpenModal();
        return;
      }
    }
  }
  closeOpenModal();

  console.log('未参与合种或者未找到亲密度入口');
  return;
}

function startTaobao(params) {
  app.launchApp("淘宝");
  sleep(5000);

  try {
    enterFarmTaobao();
    closeOpenModal();
    endFriendship();
    collect();
    className('android.widget.Button').text('集肥料').findOne().click();
    sleep(3000);
    sign();
    // 开始浏览任务
    startTaobaoBrowseTask();
    backToTaoList();
    // 开始互动任务
    startActTask();
    if (furOpen) {
      console.info('开始自动施肥');
      fertilizerTaobao();
    } else {
      console.info('未选择自动施肥，已跳过');
    }

    if (payOpen) {
      console.log('淘宝任务结束，即将开始支付宝任务');
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
  console.log('进入zfb农场');
  if (text("芭芭农场").exists()) {
    text("芭芭农场").findOne().parent().parent().click();
  } else {
    throw Error('未在首页找到芭芭农场入口，请将芭芭农场小程序移动到支付宝首页显示');
  }
  sleep(5000);
}

// 返回支付宝任务详情
function backToPayList() {
  console.log('尝试返回任务列表');

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
    console.warn('当前不在支付宝中，尝试重新进入...');
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
    console.warn('仍然在支付宝中，但不在芭芭农场页面');
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
        console.log('直接进入芭芭农场');
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
 * @deprecated
 * 开始支付宝浏览任务
 * 支付宝比较奇怪，没法通过元素反查父元素，面板里所有的元素都同级。
 * 只能通过position去尝试定位一下
 */
function startAlipaybrowse() {
  const res = findTimeout(className("android.widget.TextView").textMatches(/.*浏览15.*|.*浏览精选好物.*|.*逛15.*/), 5000);
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
      console.log('开始浏览任务，会在15秒后自动返回。')
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
 * @deprecated
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
  const allNotSupportTask = findTimeout(className("android.widget.TextView").textMatches(/.*砸蛋.*|.*落叶.*|.*下单包邮.*|.*饿了么.*/), 2000);
  let allNotSupportTaskLength = 0;
  if (allNotSupportTask) {
    console.log('当前共找到不可完成任务：', allNotSupportTask.length);
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
    console.warn("剩余任务可能均不能完成，请手动完成");
    return;
  }
  if (retryFailTasks.length > allNotSupportTaskLength) {
    console.log('部分任务状态判断失败，重试中，清空点击记录');
    btnClickTime = {};
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

const countMap = {};
// 之前的任务总是有问题..支付宝的布局问题，而且控件老是变
function startAlipayTask() {
  gatherFur();
  const allChildren = className('android.view.View').textMatches(/.*浏览.*/).findOne().parent().children();
  let preText = '';
  let taskCounts = 0;
  let allDone = false;
  // 遍历所有的子元素，按照匹配任务去执行
  allChildren.forEach(item => {
    /**
     * layout大概是这样
     * view
     * view
     *  button
     */
    if (!item.text()) { // 这样的text为空应该是按钮父布局
      console.log('进入按钮区域')
      const res = item.children();
      // console.log(res)
      if (res) {
        res.forEach(i => {
          // console.log('当前按钮文案', i.text());
          const isDoable = i
            && /.*去完成.*|.*去逛逛.*/.test(i.text())
            && /.*浏览15.*|.*浏览精选好物.*|.*逛15.*|.*逛逛.*|.*逛一逛.*|.*到淘宝.*|.*看助农小视频.*/.test(preText)
            && !/.*砸蛋.*|.*落叶.*|.*下单包邮.*|.*饿了么.*|.*合种.*/.test(preText);
          if (i) { console.log('当前按钮文案', i.text()) }
          console.log('当前判断条件成立', isDoable, preText);
          if (isDoable) {
            console.log('开始执行任务');
            taskCounts++;
            countMap[preText] = (countMap[preText] || 0) + 1;
            if (countMap[preText] > 1) {
              console.log('本任务已经执行，本次跳过');
              return;
            }
            // 浏览任务
            i.click();
            sleep(4000);
            let finish_c = 0;
            let countdown = 0;
            console.log('开始浏览任务，会在15秒后自动返回。')
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
            if (finish_c >= 35) {
              console.log('未检测到任务完成标识。返回。');
              backToPayList();
              return
            }
            backToPayList();
          }
        });
      }
      preText = '';
    } else {
      preText = preText + item.text();
    }
  });
  const retryFailTasks = Object.values(countMap).filter(i => i > 1).length;

  // 没有任务 | 本次执行的任务全部都重试过
  if (!taskCounts || retryFailTasks >= taskCounts) {
    return;
  }
  taskCounts = 0;
  // countMap = {};
  sleep(1000);
  startAlipayTask();
}

function gatherFur(params) {
  const res = findTimeout(className('android.widget.Button').text('领取'), 5000);
  if (res === null) {
    console.log('未找到领取任务');
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
    // click();
    sleep(1000);

    let loop = true;
    let clickTimes = 0;
    while (loop && clickTimes < 220) {
      // click(x, y-300)
      clickTimes++;
      // 施肥
      click(device.width / 2, y);
      if (textMatches(/.*施肥次数.*用完.*/).exists()) {
        console.info("今日施肥已达上限")
        loop = false;
      }
      sleep(500);
    }
    if (clickTimes >= 220) {
      console.info('检测任务结束异常，达到最大施肥次数，已停止');
      return;
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
      // gatherFur();
      // startAlipaybrowse();
      // sleep(2000);
      // 开始任务
      // startAlipayAct();
      startAlipayTask();
      // 支付宝施肥
      if (furOpen) {
        console.info('开始自动施肥');
        fertilizerAlipay();
      } else {
        console.info('未选择自动施肥，已跳过');
      }
    }

  } catch (error) {
    console.error('异常退出>>>', error);
    console.log('请保留日志信息，便于排查');
  }
}
if (payOpen) {
  startAlipay();
}

console.info('>>>>>全部任务已经结束<<<<<');
quit();




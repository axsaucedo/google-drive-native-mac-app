import { app, Menu, shell, Tray, BrowserWindow } from 'electron';
import Promise from 'bluebird';

// We load storage with promisify all, which creates all methods with Async promises
const storage = Promise.promisifyAll(require('electron-json-storage'));

storage.setAsync('folderId', '0B8YIJESCOtaOSFVVSEo0RE9FNTg');

class DriveUrlCreator {
  constructor() {
    this.urlHostDrive = 'https://drive.google.com/drive';
    this.urlSignOut = 'https://accounts.google.com/Logout?hl=en-GB&continue=https://drive.google.com/drive/&service=writely';
    this.urlAddAccount = 'https://accounts.google.com/AddSession?hl=en-GB&continue=https://drive.google.com/drive/&service=writely';
    this.urlNewDoc = 'https://docs.google.com/document/create';
    this.urlNewSlide = 'https://docs.google.com/presentation/create';
    this.urlNewSheet = 'https://docs.google.com/spreadsheets/create';
    this.urlQueryStringFolder = '?folder=';
    this.urlPathFolder = '/folders';

    // Setting up the local storage for folderId
    storage.getAsync('folderId')
      .then((folderId) => {
        if (!folderId) {
          return storage.setAsync('folderId', '')
            .then(() => true);
        }
        return true;
      }
    ).catch(() => true);
  }

  _getFolderId() {
    return storage.getAsync('folderId');
  }

  setFolderId(folderId) {
    return storage.setAsync('folderId', folderId);
  }

  driveHomeUrl() {
    return this.urlHostDrive;
  }

  defaultFolderUrl() {
    let url = this.urlHostDrive;

    return this._getFolderId()
      .then((folderId) => {

        if (folderId) {
          url = `${url}${this.urlPathFolder}/${folderId}`;
        }

        return url;
      });
  }

  newDocUrl() {
    return this._getFolderId()
      .then((folderId) => {
        if (folderId) {
          return `${this.urlNewDoc}${this.urlQueryStringFolder}${folderId}`;
        }

        return this.urlNewDoc;
      });
  }

  newSlideUrl() {
    return this._getFolderId()
      .then((folderId) => {
        if (folderId) {
          return `${this.urlNewSlide}${this.urlQueryStringFolder}${folderId}`;
        }

        return this.urlNewSlide;
      });
  }

  newSheetUrl() {
    return this._getFolderId()
      .then((folderId) => {
        if (folderId) {
          return `${this.urlNewSheet}${this.urlQueryStringFolder}${folderId}`;
        }

        return this.urlNewSheet;
      });
  }

  addAccountUrl() {
    return this.urlAddAccount;
  }

  signOutUrl() {
    return this.urlSignOut;
  }
}

export default class MenuBuilder {

  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.driveUrlCreator = new DriveUrlCreator();
  }

  buildMenu(env, platform) {

    if (env === 'development') {
      this._setupDevelopmentEnvironment();
    }

    let template;

    if (platform === 'darwin') {
      template = this._buildDarwinTemplate();
    } else {
      template = this._buildDefaultTemplate();
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  _setupDevelopmentEnvironment() {
    this.mainWindow.openDevTools();
    this.mainWindow.webContents.on('context-menu', (e, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([{
        label: 'Inspect element',
        click() {
          this.mainWindow.inspectElement(x, y);
        }
      }]).popup(this.mainWindow);
    });
  }

  _saveCurrentFolderAsDefault() {
    const latestUrl = this.mainWindow.webContents.getURL();

    if (latestUrl.startsWith(this.driveUrlCreator.driveHomeUrl())) {
      const re = /.*folders\/(\w+).*/g;
      const found = re.exec(latestUrl);
      if (found) {
        const folderId = found[1];
        this.driveUrlCreator.setFolderId(folderId)
          .then(() => {
            this.mainWindow.webContents.executeJavaScript('alert("The folder has successfully updated!");');
            return true;
          })
          .catch(() => { });
      }
      else {
        this.mainWindow.webContents.executeJavaScript('alert("We were not able to update the current folder... If you keep experiencing difficulties please let us know!");');
      }
    }
    else {
      this.mainWindow.webContents.executeJavaScript('alert("It seems that you\'re not in a Google Drive folder! If you are, then something went wrong!");');
    }
  }

  _openNewWindow(url) {
    let newWindow = new BrowserWindow({
      show: false,
      width: 1024,
      height: 728
    });

    newWindow.loadURL(url);

    newWindow.webContents.on('did-finish-load', () => {
      newWindow.show();
      newWindow.focus();
    });

    newWindow.on('closed', () => {
      newWindow = null;
    });
  }

  _quitApp() {
    app.quit();
  }

  _buildDarwinTemplate() {
    const subMenuAbout = {
      label: 'GDrive App',
      submenu: [
        { label: 'About GDrive App', selector: 'orderFrontStandardAboutPanel:' },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide GDrive App', accelerator: 'Command+H', selector: 'hide:' },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => { this._quitApp() } }
      ]
    };
    const subMenuEdit = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'Command+A', selector: 'selectAll:' }
      ]
    };
    const subMenuViewDev = {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Command+R', click:() => { this.mainWindow.webContents.reload() } },
        { label: 'Toggle Full Screen', accelerator: 'Ctrl+Command+F', click: () => { this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen()) } },
        { label: 'Toggle Developer Tools', accelerator: 'Alt+Command+I', click: () => { this.mainWindow.toggleDevTools() } }
      ]
    };
    const subMenuViewProd = {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Command+R', click:() => { this.mainWindow.webContents.reload() } },
        { label: 'Toggle Full Screen', accelerator: 'Ctrl+Command+F', click: () => { this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen()) } }
      ]
    };
    const subMenuGoTo = {
      label: 'Drive Actions',
      submenu: [
        { label: 'Drive Home', accelerator: 'Command+H', click: () => { this.mainWindow.loadURL(this.driveUrlCreator.driveHomeUrl()) } },
        {
          label: 'Default Folder',
          accelerator: 'Command+D',
          click: async () => {
            this.mainWindow.loadURL(await this.driveUrlCreator.defaultFolderUrl());
          }
        },
        { type: 'separator' },
        { label: 'Save Default Folder', accelerator: 'Command+S', click: () => { this._saveCurrentFolderAsDefault() } },
        { type: 'separator' },
        {
          label: 'New GDoc',
          accelerator: 'Command+1',
          click: async () => {
            this._openNewWindow(await this.driveUrlCreator.newDocUrl());
          }
        },
        {
          label: 'New GSlide',
          accelerator: 'Command+2',
          click: async () => {
            this._openNewWindow(await this.driveUrlCreator.newSlideUrl());
          }
        },
        {
          label: 'New GSheet',
          accelerator: 'Command+3',
          click: async () => {
            this._openNewWindow(await this.driveUrlCreator.newSheetUrl());
          }
        },
        { type: 'separator' },
        { label: 'Add account', click: () => { this._openNewWindow(this.driveUrlCreator.addAccountUrl()) } },
        { label: 'Sign out', click: () => { this._openNewWindow(this.driveUrlCreator.signOutUrl()) } }
      ]
    };
    const subMenuWindow = {
      label: 'Window',
      submenu: [
        { label: 'History Back', accelerator: 'Command+Alt+Left', click: () => { this.mainWindow.webContents.goBack(); } },
        { label: 'History Forward', accelerator: 'Command+Alt+Right', click: () => { this.mainWindow.webContents.goForward(); } },
        { type: 'separator' },
        { label: 'Minimize', accelerator: 'Command+M', selector: 'performMiniaturize:' },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' }
      ]
    };
    const subMenuHelp = {
      label: 'Help',
      submenu: [
        { label: 'Learn More', click() { shell.openExternal('http://electron.atom.io') } },
        { label: 'Documentation', click() { shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme') } },
        { label: 'Community Discussions', click() { shell.openExternal('https://discuss.atom.io/c/electron') } },
        { label: 'Search Issues', click() { shell.openExternal('https://github.com/atom/electron/issues') } }
      ]
    };

    const subMenuView = process.env.NODE_ENV === 'development' ? subMenuViewDev : subMenuViewProd;

    return [
      subMenuAbout,
      subMenuEdit,
      subMenuView,
      subMenuGoTo,
      subMenuWindow,
      subMenuHelp
    ];
  }

  _buildDefaultTemplate() {
    const templateDefault = [{
      label: '&File',
      submenu: [{
        label: '&Open',
        accelerator: 'Ctrl+O'
      }, {
        label: '&Close',
        accelerator: 'Ctrl+W',
        click: () => {
          this.mainWindow.close();
        }
      }]
    }, {
      label: '&View',
      submenu: (process.env.NODE_ENV === 'development') ? [{
        label: '&Reload',
        accelerator: 'Ctrl+R',
        click: () => {
          this.mainWindow.webContents.reload();
        }
      }, {
        label: 'Toggle &Full Screen',
        accelerator: 'F11',
        click: () => {
          this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
        }
      }, {
        label: 'Toggle &Developer Tools',
        accelerator: 'Alt+Ctrl+I',
        click: () => {
          this.mainWindow.toggleDevTools();
        }
      }] : [{
        label: 'Toggle &Full Screen',
        accelerator: 'F11',
        click: () => {
          this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
        }
      }]
    }, {
      label: 'Help',
      submenu: [{
        label: 'Learn More',
        click() {
          shell.openExternal('http://electron.atom.io');
        }
      }, {
        label: 'Documentation',
        click() {
          shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme');
        }
      }, {
        label: 'Community Discussions',
        click() {
          shell.openExternal('https://discuss.atom.io/c/electron');
        }
      }, {
        label: 'Search Issues',
        click() {
          shell.openExternal('https://github.com/atom/electron/issues');
        }
      }]
    }];

    return templateDefault;
  }
}

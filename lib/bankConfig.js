// Cấu hình danh sách ngân hàng Việt Nam
export const BANK_CONFIG = {
  MB: {
    id: 'MB',
    name: 'MB Bank',
    shortName: 'MB',
    bin: '970422',
    appScheme: 'mbbank://',
    webUrl: 'https://ebanking.mbbank.com.vn',
    androidPackage: 'com.mbmobile',
    iosScheme: 'mbbank',
    logo: 'https://api.vietqr.io/img/MB.png'
  },
  VCB: {
    id: 'VCB',
    name: 'Vietcombank',
    shortName: 'VCB',
    bin: '970436',
    appScheme: 'vcbdigibank://',
    webUrl: 'https://vcbdigibank.vietcombank.com.vn',
    androidPackage: 'com.VCB',
    iosScheme: 'vcbdigibank',
    logo: 'https://api.vietqr.io/img/VCB.png'
  },
  TCB: {
    id: 'TCB',
    name: 'Techcombank',
    shortName: 'TCB',
    bin: '970407',
    appScheme: 'techcombank://',
    webUrl: 'https://www.techcombank.com.vn/dich-vu-ngan-hang-so',
    androidPackage: 'com.techcombank.mb.portal',
    iosScheme: 'techcombank',
    logo: 'https://api.vietqr.io/img/TCB.png'
  },
  BIDV: {
    id: 'BIDV',
    name: 'BIDV',
    shortName: 'BIDV',
    bin: '970418',
    appScheme: 'bidv://',
    webUrl: 'https://smartbanking.bidv.com.vn',
    androidPackage: 'com.vnpay.bidv',
    iosScheme: 'bidv',
    logo: 'https://api.vietqr.io/img/BIDV.png'
  },
  VTB: {
    id: 'VTB',
    name: 'Vietinbank',
    shortName: 'VTB',
    bin: '970415',
    appScheme: 'ipayplus://',
    webUrl: 'https://ipay.vietinbank.vn',
    androidPackage: 'com.vietinbank.ipay',
    iosScheme: 'ipayplus',
    logo: 'https://api.vietqr.io/img/VTB.png'
  },
  ACB: {
    id: 'ACB',
    name: 'ACB',
    shortName: 'ACB',
    bin: '970416',
    appScheme: 'acbmobilebanking://',
    webUrl: 'https://online.acb.com.vn',
    androidPackage: 'com.acb',
    iosScheme: 'acbmobilebanking',
    logo: 'https://api.vietqr.io/img/ACB.png'
  },
  TPB: {
    id: 'TPB',
    name: 'TPBank',
    shortName: 'TPB',
    bin: '970423',
    appScheme: 'tpb://',
    webUrl: 'https://ebank.tpb.vn',
    androidPackage: 'mobile.app.tpbank',
    iosScheme: 'tpb',
    logo: 'https://api.vietqr.io/img/TPB.png'
  },
  VPB: {
    id: 'VPB',
    name: 'VPBank',
    shortName: 'VPB',
    bin: '970432',
    appScheme: 'vpbanknext://',
    webUrl: 'https://vpbanknext.com.vn',
    androidPackage: 'com.vpbank.vpbanknext',
    iosScheme: 'vpbanknext',
    logo: 'https://api.vietqr.io/img/VPB.png'
  },
  MSB: {
    id: 'MSB',
    name: 'MSB',
    shortName: 'MSB',
    bin: '970426',
    appScheme: 'msb://',
    webUrl: 'https://ibanking.msb.com.vn',
    androidPackage: 'com.msb',
    iosScheme: 'msb',
    logo: 'https://api.vietqr.io/img/MSB.png'
  },
  OCB: {
    id: 'OCB',
    name: 'OCB',
    shortName: 'OCB',
    bin: '970448',
    appScheme: 'ocb://',
    webUrl: 'https://omni.ocb.com.vn',
    androidPackage: 'com.ocb',
    iosScheme: 'ocb',
    logo: 'https://api.vietqr.io/img/OCB.png'
  }
}

export const BANK_LIST = Object.values(BANK_CONFIG)

// Tạo VietQR URL
export function generateVietQR({ bankId, accountNo, accountName, amount, description }) {
  const bankBin = BANK_CONFIG[bankId]?.bin || bankId
  const encodedDesc = encodeURIComponent(description)
  const encodedName = encodeURIComponent(accountName || '')
  return `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodedName}`
}

// Tạo deeplink cho ngân hàng
export function generateDeeplink({ bankId, accountNo, amount, description }) {
  const bank = BANK_CONFIG[bankId]
  if (!bank) return null
  
  const params = new URLSearchParams({
    amount: amount,
    content: description,
    to: accountNo
  })
  
  return {
    appUrl: `${bank.appScheme}transfer?${params.toString()}`,
    webUrl: bank.webUrl,
    androidPackage: bank.androidPackage
  }
}

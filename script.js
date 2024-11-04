function generateCard() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const github = document.getElementById("github").value;
  const qiita = document.getElementById("qiita").value;
  const x = document.getElementById("x").value;
  const title = document.getElementById("title").value; // 追加
  const interests = document.getElementById("interests").value; // 追加

  // GitHubのプロフィール画像を取得
  const githubUsername = github.split('/').pop();
  const profileImgUrl = `https://avatars.githubusercontent.com/${githubUsername}`;
  document.getElementById("profile-img").src = profileImgUrl;
  document.getElementById("display-name").innerText = name;
  document.getElementById("display-title").innerText = title; // 追加
  document.getElementById("display-interests").innerText = interests; // 追加
  document.getElementById("display-email").innerText = email;
  document.getElementById("display-github").innerText = github;
  document.getElementById("display-qiita").innerText = qiita;
  document.getElementById("display-x").innerText = x;

  document.getElementById("card").style.display = "flex";

  // URLにパラメータを追加
  const params = new URLSearchParams();
  if (name) params.append('name', name);
  if (email) params.append('email', email);
  if (github) params.append('github', github);
  if (qiita) params.append('qiita', qiita);
  if (x) params.append('x', x);
  if (title) params.append('title', title); // 追加
  if (interests) params.append('interests', interests); // 追加

  // 現在のURLにパラメータを追加
  const currentUrl = window.location.origin + window.location.pathname;
  const newUrl = `${currentUrl}?${params.toString()}`;
  window.history.pushState({ path: newUrl }, '', newUrl);
}

function downloadPDF() {
  const card = document.getElementById("card");
  const opt = {
    margin: 0,
    filename: 'business_card.pdf',
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { 
        scale: 2,
        useCORS: true
    },
    jsPDF: { unit: 'cm', format: [9.1, 5.5], orientation: 'landscape' }
  };

  const images = Array.from(card.getElementsByTagName('img'));
  const imagePromises = images.map(img => {
      return new Promise((resolve) => {
          if (img.complete) {
              resolve();
          } else {
              img.onload = resolve;
              img.onerror = () => {
                  console.error(`Image failed to load: ${img.src}`);
                  resolve();
              };
          }
      });
  });

  Promise.all(imagePromises).then(() => {
      html2pdf().from(card).set(opt).output('blob').then(async (pdfBlob) => {
          try {
              // `pdf-lib`で1ページ目のみ抽出
              const pdfDoc = await PDFLib.PDFDocument.load(await pdfBlob.arrayBuffer());
              const newPdfDoc = await PDFLib.PDFDocument.create();
              const [firstPage] = await newPdfDoc.copyPages(pdfDoc, [0]); // 1ページ目のみコピー
              newPdfDoc.addPage(firstPage);

              // 新しいPDFをバイナリデータとして保存
              const pdfBytes = await newPdfDoc.save();
              const finalBlob = new Blob([pdfBytes], { type: "application/pdf" });

              // ダウンロードリンクを作成してダウンロード
              const link = document.createElement("a");
              link.href = URL.createObjectURL(finalBlob);
              link.download = "business_card_single_page.pdf";
              link.click();

              // メモリを解放
              URL.revokeObjectURL(link.href);
          } catch (error) {
              console.error("PDF生成中にエラーが発生しました:", error);
          }
      });
  }).catch((error) => {
      console.error("画像の読み込みに失敗しました:", error);
  });
}

// URLパラメータを取得し、フォームに反映する関数
function populateFormFromURL() {
  const params = new URLSearchParams(window.location.search);
  
  // 各入力欄にURLパラメータの値を設定
  if (params.has('name')) {
      document.getElementById('name').value = params.get('name');
  }
  if (params.has('email')) {
      document.getElementById('email').value = params.get('email');
  }
  if (params.has('github')) {
      document.getElementById('github').value = params.get('github');
  }
  if (params.has('qiita')) {
      document.getElementById('qiita').value = params.get('qiita');
  }
  if (params.has('x')) {
      document.getElementById('x').value = params.get('x');
  }
  if (params.has('title')) { // 追加
      document.getElementById('title').value = params.get('title');
  }
  if (params.has('interests')) { // 追加
      document.getElementById('interests').value = params.get('interests');
  }
}


// DOMが完全に読み込まれたら関数を実行
document.addEventListener('DOMContentLoaded', populateFormFromURL);

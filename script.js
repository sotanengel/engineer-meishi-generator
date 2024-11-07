function generateCard() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const github = document.getElementById("github").value;
  const qiita = document.getElementById("qiita").value;
  const x = document.getElementById("x").value;
  const title = document.getElementById("title").value;
  const interests = document.getElementById("interests").value;
  const qiita_user_name = qiita.split("/").pop();
  const x_user_name = x.split("/").pop();

  const githubUsername = github.split("/").pop();
  const profileImgUrl = `https://avatars.githubusercontent.com/${githubUsername}`;

  document.getElementById("profile-img").src = profileImgUrl;
  document.getElementById("display-name").innerText = name;
  document.getElementById("display-title").innerText = title;
  document.getElementById("display-interests").innerText = interests;
  document.getElementById("display-email").innerText = email;
  document.getElementById("display-github").innerText = github;
  document.getElementById("display-qiita").innerText = qiita;
  document.getElementById("display-x").innerText = x;

  document.getElementById("card").style.display = "flex";

  // Fetch and display Rust repositories in the output div, then update the URL with the top repositories
  fetchRepositories(githubUsername, name, email, qiita_user_name, x_user_name);
}

async function fetchRepositories(githubUsername, name, email, qiita, x) {
  const apiUrl = `https://api.github.com/users/${githubUsername}/repos?sort=stars`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch GitHub repositories");
    }

    const repos = await response.json();
    const rustRepos = [];

    for (const repo of repos) {
      if (repo.language === "Rust" && !repo.fork) {
        rustRepos.push({
          name: repo.name,
          stars: repo.stargazers_count,
        });
      } else if (!repo.fork) {
        const languagesResponse = await fetch(repo.languages_url);
        if (languagesResponse.ok) {
          const languages = await languagesResponse.json();
          if ("Rust" in languages) {
            rustRepos.push({
              name: repo.name,
              stars: repo.stargazers_count,
            });
          }
        }
      }
    }

    // Sort repositories by star count and select the top 3
    rustRepos.sort((a, b) => b.stars - a.stars);
    const topRepos = rustRepos.slice(0, 3).map((repo) => repo.name);

    // Construct new URL with name and top 3 repositories
    const params = new URLSearchParams();
    params.append("name", name);
    params.append("github", githubUsername);
    params.append("email", email);
    params.append("qiita", qiita);
    params.append("x", x);

    topRepos.forEach((repo, index) => params.append(`repo${index + 1}`, repo));

    const baseUrl =
      "https://sotanengel.github.io/engineer-meishi-generator/digital_meishi/20241107_for_rust_tokyo.html";
    const newUrl = `${baseUrl}?${params.toString()}`;

    // Generate QR code with new URL
    generateQRCode(newUrl);

    // カニ画像などもここで処理
    const totalStars = rustRepos.reduce((sum, repo) => sum + repo.stars, 0);
    let crabImage;
    if (totalStars < 5) {
      crabImage = "img/kani/red.png";
    } else if (totalStars < 10) {
      crabImage = "img/kani/bronze.png";
    } else if (totalStars < 30) {
      crabImage = "img/kani/silver.png";
    } else {
      crabImage = "img/kani/gold.png";
    }
    document.querySelector("#card2 .crab-img").src = crabImage;

    document.getElementById("card2").style.display = "flex";
  } catch (error) {
    crabImage = "img/kani/red.png";
    document.querySelector("#card2 .crab-img").src = crabImage;
  }
}

function generateQRCode(url) {
  // QRコード用のimg要素を取得
  const qrCodeImage = document.getElementById("qrcode");

  // img要素が存在する場合
  if (qrCodeImage) {
    // QRコードライブラリを使用してQRコードを生成
    const qrCodeUrl = generateQRCodeFromUrl(url); // これは適切なQRコード生成関数に置き換えてください

    // 生成したQRコードURLをimg要素のsrc属性にセット
    qrCodeImage.src = qrCodeUrl;
  } else {
    console.error("QR code image element not found");
  }
}

function generateQRCodeFromUrl(url) {
  // QRコード生成のロジック（例：QRコードライブラリの使用）
  // ここで実際にURLをQRコードに変換するコードを書く
  // 仮の実装として、URLをそのまま使っているが、実際にはライブラリを使ってQRコードURLを生成する
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
    url
  )}&size=150x150`;
}

async function downloadPDF() {
  const cardIds = ["card", "card2"];
  const opt = {
    margin: 0,
    filename: "meishi_mae.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 4, useCORS: true },
    jsPDF: { unit: "mm", format: [91, 55], orientation: "landscape" },
  };

  for (const cardId of cardIds) {
    const card = document.getElementById(cardId);
    const images = Array.from(card.getElementsByTagName("img"));

    const imagePromises = images.map((img) => {
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

    try {
      // 画像の読み込みが終わるまで待機
      await Promise.all(imagePromises);

      // html2pdfでカードの内容をPDFのblob形式で生成
      const pdfBlob = await html2pdf().from(card).set(opt).output("blob");

      // pdf-libで1ページ目のみを取得
      const pdfDoc = await PDFLib.PDFDocument.load(await pdfBlob.arrayBuffer());
      const newPdfDoc = await PDFLib.PDFDocument.create();
      const [firstPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
      newPdfDoc.addPage(firstPage);

      // 新しいPDFをバイナリデータとして保存
      const pdfBytes = await newPdfDoc.save();
      const finalBlob = new Blob([pdfBytes], { type: "application/pdf" });

      // ダウンロードリンクを作成してダウンロード
      const link = document.createElement("a");
      link.href = URL.createObjectURL(finalBlob);
      link.download = `${cardId}_single_page.pdf`;
      link.click();

      // メモリを解放
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error(`PDF生成中にエラーが発生しました (${cardId}):`, error);
    }
  }
}

// URLパラメータを取得し、フォームに反映する関数
function populateFormFromURL() {
  const params = new URLSearchParams(window.location.search);

  // 各入力欄にURLパラメータの値を設定
  if (params.has("name")) {
    document.getElementById("name").value = params.get("name");
  }
  if (params.has("email")) {
    document.getElementById("email").value = params.get("email");
  }
  if (params.has("github")) {
    document.getElementById("github").value = params.get("github");
  }
  if (params.has("qiita")) {
    document.getElementById("qiita").value = params.get("qiita");
  }
  if (params.has("x")) {
    document.getElementById("x").value = params.get("x");
  }
  if (params.has("title")) {
    // 追加
    document.getElementById("title").value = params.get("title");
  }
  if (params.has("interests")) {
    // 追加
    document.getElementById("interests").value = params.get("interests");
  }
}

// DOMが完全に読み込まれたら関数を実行
document.addEventListener("DOMContentLoaded", populateFormFromURL);

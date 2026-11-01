import "fake-indexeddb/auto";
import { strToU8, zipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteNovel, updateBookTitle } from "../bookStorage";
import { LexiconDatabase } from "../lexiconDb";
import {
  addMangaArchiveFile,
  addMangaImagesOrFolder,
  createMangaPageSource,
  isValidMangaImageEntry,
  naturalCompare,
  naturalSortPageNames,
  parseComicInfoXml,
  resolveMangaMetadataFromComicInfo,
  updateMangaPageOrder,
  updateMangaProgress,
} from "../mangaStorage";

describe("Tahap 1 - Perpustakaan Manga (Natural Sort, Filter Sampah, ComicInfo, Lazy Storage)", () => {
  let db: LexiconDatabase;

  beforeEach(() => {
    db = new LexiconDatabase(`test-manga-lib-${Date.now()}-${Math.random()}`);
  });

  it("mengurutkan nama berkas dengan natural sort (halaman 2 sebelum halaman 10)", () => {
    const unordered = [
      "page_10.jpg",
      "page_2.jpg",
      "page_1.jpg",
      "page_20.jpg",
      "page_03.jpg",
    ];
    const sorted = naturalSortPageNames(unordered);
    expect(sorted).toEqual([
      "page_1.jpg",
      "page_2.jpg",
      "page_03.jpg",
      "page_10.jpg",
      "page_20.jpg",
    ]);

    const multiChapter = [
      "Vol1/Ch10/001.webp",
      "Vol1/Ch2/010.webp",
      "Vol1/Ch2/002.webp",
      "Vol1/Ch1/001.webp",
    ];
    expect(naturalSortPageNames(multiChapter)).toEqual([
      "Vol1/Ch1/001.webp",
      "Vol1/Ch2/002.webp",
      "Vol1/Ch2/010.webp",
      "Vol1/Ch10/001.webp",
    ]);
    expect(naturalCompare("2.png", "10.png")).toBeLessThan(0);
  });

  it("menyaring hanya gambar valid (.jpg, .jpeg, .png, .webp) dan mengabaikan __MACOSX/.DS_Store/bukan gambar", () => {
    expect(isValidMangaImageEntry("001.jpg")).toBe(true);
    expect(isValidMangaImageEntry("chapter_1/page_02.JPEG")).toBe(true);
    expect(isValidMangaImageEntry("vol01/p03.png")).toBe(true);
    expect(isValidMangaImageEntry("vol01/p04.WEBP")).toBe(true);

    // Berkas sampah sistem operasi dan bukan gambar harus ditolak
    expect(isValidMangaImageEntry("__MACOSX/001.jpg")).toBe(false);
    expect(isValidMangaImageEntry("vol1/__MACOSX/._001.png")).toBe(false);
    expect(isValidMangaImageEntry("vol1/._001.png")).toBe(false);
    expect(isValidMangaImageEntry(".DS_Store")).toBe(false);
    expect(isValidMangaImageEntry("Thumbs.db")).toBe(false);
    expect(isValidMangaImageEntry(".hidden/001.jpg")).toBe(false);
    expect(isValidMangaImageEntry("ComicInfo.xml")).toBe(false);
    expect(isValidMangaImageEntry("readme.txt")).toBe(false);
    expect(isValidMangaImageEntry("manga.pdf")).toBe(false);
    expect(isValidMangaImageEntry("folder_kosong/")).toBe(false);
  });

  it("membaca metadata opsional dari ComicInfo.xml dengan benar", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <ComicInfo>
        <Title>旅の始まり</Title>
        <Series>葬送のフリーレン</Series>
        <Volume>1</Volume>
        <Writer>山田鐘人</Writer>
        <Penciller>アベツカサ</Penciller>
        <Manga>YesAndRightToLeft</Manga>
      </ComicInfo>`;

    const info = parseComicInfoXml(xml);
    expect(info.series).toBe("葬送のフリーレン");
    expect(info.title).toBe("旅の始まり");
    expect(info.volume).toBe("1");
    expect(info.writer).toBe("山田鐘人");
    expect(info.penciller).toBe("アベツカサ");
    expect(info.readingDirection).toBe("rtl");

    const resolved = resolveMangaMetadataFromComicInfo(info, "fallback_name");
    expect(resolved.title).toBe("葬送のフリーレン (Vol. 1) - 旅の始まり");
    expect(resolved.author).toBe("山田鐘人, アベツカサ");
    expect(resolved.volume).toBe("Vol. 1");
    expect(resolved.readingDirection).toBe("rtl");
  });

  it("menyimpan CBZ di IndexedDB, mengurutkan halaman dengan natural sort, dan membaca halaman secara malas (lazy)", async () => {
    const zipped = zipSync({
      "ComicInfo.xml": strToU8(
        `<ComicInfo><Series>よつばと!</Series><Volume>2</Volume><Writer>あずまきよひこ</Writer></ComicInfo>`,
      ),
      "__MACOSX/._page_1.png": strToU8("junk-mac"),
      ".DS_Store": strToU8("junk-ds"),
      "readme.txt": strToU8("ignore me"),
      "page_10.jpg": new Uint8Array([0xff, 0xd8, 0xff, 10]),
      "page_2.jpg": new Uint8Array([0xff, 0xd8, 0xff, 2]),
      "page_1.jpg": new Uint8Array([0xff, 0xd8, 0xff, 1]),
    });

    const cbzFile = new File([zipped], "Yotsubato_v02.cbz", {
      type: "application/vnd.comicbook+zip",
    });

    const record = await addMangaArchiveFile(cbzFile, db);
    expect(record.type).toBe("manga");
    expect(record.format).toBe("cbz");
    expect(record.title).toBe("よつばと! Vol. 2");
    expect(record.author).toBe("あずまきよひこ");
    expect(record.pageCount).toBe(3);
    expect(record.pageOrder).toEqual(["page_1.jpg", "page_2.jpg", "page_10.jpg"]);

    // Buka sumber halaman secara malas (lazy) dan verifikasi isi byte per halaman
    const source = await createMangaPageSource(record.id, db);
    expect(source.pageCount).toBe(3);

    const page2Blob = await source.loadPageBlob(1); // indeks 1 = page_2.jpg
    const page2Bytes = new Uint8Array(await page2Blob.arrayBuffer());
    expect(Array.from(page2Bytes)).toEqual([0xff, 0xd8, 0xff, 2]);
    await source.close();

    // Uji pengurutan manual dan edit judul
    await updateBookTitle(record.id, "よつばと! 第2巻 ( Edisi Revisi )", db);
    const reordered = await updateMangaPageOrder(
      record.id,
      ["page_10.jpg", "page_2.jpg", "page_1.jpg"],
      db,
    );
    expect(reordered.title).toBe("よつばと! 第2巻 ( Edisi Revisi )");
    expect(reordered.pageOrder).toEqual(["page_10.jpg", "page_2.jpg", "page_1.jpg"]);

    // Uji update progres halaman
    await updateMangaProgress(record.id, 1, 3, db);
    const afterProg = await db.books.get(record.id);
    expect(afterProg?.currentPage).toBe(1);
    expect(afterProg?.progress).toBe(67);

    // Uji hapus manga secara bersih
    await deleteNovel(record.id, db);
    expect(await db.books.get(record.id)).toBeUndefined();
    expect(await db.bookFiles.get(record.id)).toBeUndefined();
  });

  it("mendukung impor dari beberapa berkas gambar atau satu folder (webkitRelativePath)", async () => {
    const f10 = new File([new Uint8Array([1, 2, 10])], "10.webp", {
      type: "image/webp",
    });
    Object.defineProperty(f10, "webkitRelativePath", {
      value: "Solo_Folder/10.webp",
    });

    const f2 = new File([new Uint8Array([1, 2, 2])], "2.webp", {
      type: "image/webp",
    });
    Object.defineProperty(f2, "webkitRelativePath", {
      value: "Solo_Folder/2.webp",
    });

    const junk = new File([new Uint8Array([0])], ".DS_Store");
    Object.defineProperty(junk, "webkitRelativePath", {
      value: "Solo_Folder/.DS_Store",
    });

    const record = await addMangaImagesOrFolder([f10, f2, junk], undefined, db);
    expect(record.type).toBe("manga");
    expect(record.format).toBe("images");
    expect(record.title).toBe("Solo_Folder");
    expect(record.pageCount).toBe(2);
    expect(record.pageOrder).toEqual([
      "Solo_Folder/2.webp",
      "Solo_Folder/10.webp",
    ]);

    const source = await createMangaPageSource(record.id, db);
    const firstPageBlob = await source.loadPageBlob(0);
    expect(Array.from(new Uint8Array(await firstPageBlob.arrayBuffer()))).toEqual([
      1, 2, 2,
    ]);
    await source.close();
  });

  it("menampilkan pesan error bahasa Indonesia yang jelas untuk arsip rusak, tanpa gambar, atau PDF", async () => {
    const pdfFile = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "komik.pdf");
    await expect(addMangaArchiveFile(pdfFile, db)).rejects.toThrow(
      /Format PDF tidak didukung/i,
    );

    const corruptZip = new File([new Uint8Array([1, 2, 3, 4, 5])], "rusak.cbz");
    await expect(addMangaArchiveFile(corruptZip, db)).rejects.toThrow(
      /rusak atau bukan berkas ZIP yang valid/i,
    );

    const emptyNoImageZip = zipSync({
      "readme.txt": strToU8("hanya teks tanpa gambar"),
      "__MACOSX/._01.jpg": strToU8("sampah"),
    });
    const noImageCbz = new File([emptyNoImageZip], "tanpa_gambar.zip");
    await expect(addMangaArchiveFile(noImageCbz, db)).rejects.toThrow(
      /tidak berisi berkas gambar yang didukung/i,
    );
  });
});


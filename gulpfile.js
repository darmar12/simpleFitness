const {
    src,
    dest,
    series,
    watch
} = require('gulp');
const { readFileSync } = require('fs');
const pug = require('gulp-pug');
const sass = require('sass');
const gulpSass = require('gulp-sass');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const webpackStream = require('webpack-stream');
const image = require('gulp-imagemin');
const webp = require('gulp-webp');
const avif = require('gulp-avif');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const sprite = require('gulp-svg-sprite');
const del = require('del');
const browserSync = require('browser-sync').create();
const rev = require('gulp-rev');
const revDel = require('gulp-rev-delete-original');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const gulpif = require('gulp-if');
const typograf = require('gulp-typograf');
const zip = require('gulp-zip');
const path = require('path');

const useSass = gulpSass(sass);

const rootFolder = path.basename(path.resolve());
const srcFolder = './src';
const buildFolder = './app';

let production = false;

const clean = () => {
    return del([buildFolder]);
}

const pugPages = () => {
    return src([`${srcFolder}/*.pug`, `${srcFolder}/pages/*.pug`])
        .pipe(pug({
            pretty: true
        }))
        .pipe(typograf({
            locale: ['ru', 'en-US']
        }))
        .pipe(dest(buildFolder))
        .pipe(browserSync.stream());
};

const styles = () => {
    return src(`${srcFolder}/scss/**/*.scss`, {sourcemaps: !production})
        .pipe(plumber(
            notify.onError({
                title: "SCSS",
                message: "Error: <%= error.message %>"
            })
        ))
        .pipe(useSass())
        .pipe(autoprefixer({
            cascade: false,
            grid: true,
            overrideBrowserslist: ["last 5 versions"]
        }))
        .pipe(gulpif(production, cleanCSS({
            level: 2
        })))
        .pipe(dest(`${buildFolder}/css`, {sourcemaps: '.'}))
        .pipe(browserSync.stream());
};

const stylesBackend = () => {
    return src(`${srcFolder}/scss/**/*.scss`)
        .pipe(plumber(
            notify.onError({
                title: "SCSS",
                message: "Error: <%= error.message %>"
            })
        ))
        .pipe(useSass())
        .pipe(autoprefixer({
            cascade: false,
            grid: true,
            overrideBrowserslist: ["last 5 versions"]
        }))
        .pipe(dest(`${buildFolder}/css`, {sourcemaps: '.'}))
        .pipe(browserSync.stream());
};

const scripts = () => {
    return src(`${srcFolder}/js/main.js`)
        .pipe(plumber(
            notify.onError({
                title: "JS",
                message: "Error: <%= error.message %>"
            })
        ))
        .pipe(webpackStream({
            mode: production ? 'production' : 'development',
            output: {
                filename: 'main.js',
            },
            module: {
                rules: [{
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    targets: "defaults"
                                }]
                            ]
                        }
                    }
                }]
            },
            devtool: !production ? 'source-map' : false
        }))
        .on('error', function (err) {
            console.error('WEBPACK ERROR', err);
            this.emit('end');
        })
        .pipe(dest(`${buildFolder}/js`))
        .pipe(browserSync.stream());
};

const scriptsBackend = () => {
    return src(`${srcFolder}/js/main.js`)
        .pipe(plumber(
            notify.onError({
            title: "JS",
            message: "Error: <%= error.message %>"
            })
        ))
        .pipe(webpackStream({
            mode: 'development',
            output: {
                filename: 'main.js',
            },
            module: {
                rules: [{
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    targets: "defaults"
                                }]
                            ]
                        }
                    }
                }]
            },
            devtool: !production ? 'source-map' : false
        }))
        .on('error', function (err) {
            console.error('WEBPACK ERROR', err);
            this.emit('end');
        })
        .pipe(dest(`${buildFolder}/js`))
        .pipe(browserSync.stream());
};

const images = () => {
    return src(`${srcFolder}/images/**/*.{jpg,jpeg,png,svg}`)
        .pipe(gulpif(production, image([
            image.mozjpeg({
                quality: 80,
                progressive: true
            }),
            image.optipng({
                optimizationLevel: 2
            })
        ])))
        .pipe(dest(`${buildFolder}/images`));
};

const webpImages = () => {
    return src(`${srcFolder}/images/**/*.{jpg,jpeg,png}`)
        .pipe(webp())
        .pipe(dest(`${buildFolder}/images`));
};

const avifImages = () => {
    return src(`${srcFolder}/images/**/*.{jpg,jpeg,png}`)
        .pipe(avif())
        .pipe(dest(`${buildFolder}/images`));
};

const svgSprite = () => {
    return src(`${srcFolder}/images/svg/**.svg`)
        .pipe(svgmin({
            js2svg: {
                pretty: true,
            }
        }))
        .pipe(cheerio({
            run: function ($) {
                $('[fill]').removeAttr('fill');
                $('[stroke]').removeAttr('stroke');
                $('[style]').removeAttr('style');
            },
            parserOptions: {
                xmlMode: true
            }
        }))
        .pipe(replace('&gt;', '>'))
        .pipe(sprite({
            mode: {
                stack: {
                  sprite: "../sprite.svg"
                }
            }
        }))
        .pipe(dest(`${buildFolder}/images/svg`));
};

const fonts = () => {
    return src(`${srcFolder}/fonts/*.{woff,woff2}`)
        .pipe(dest(`${buildFolder}/fonts`))
};

const watchFiles = () => {
    browserSync.init({
      server: {
        baseDir: `${buildFolder}`
      },
    });

    watch(`${srcFolder}/pages/**/*.pug`, pugPages);
    watch(`${srcFolder}/*.pug`, pugPages);
    watch(`${srcFolder}/js/**/**.js`, scripts);
    watch(`${srcFolder}/scss/**/**.scss`, styles);
    watch(`${srcFolder}/fonts/*.{woof, woff2}`, fonts);
    watch(`${srcFolder}/images/**/**.{jpg,jpeg,png,svg}`, images);
    watch(`${srcFolder}/images/**/**.{jpg,jpeg,png}`, webpImages);
    watch(`${srcFolder}/images/**/**.{jpg,jpeg,png}`, avifImages);
    watch(`${srcFolder}/images/svg/**/**.svg`, svgSprite);
};

const cache = () => {
    return src(`${buildFolder}/**/*.{css,js,svg,png,jpg,jpeg,webp,avif,woff2}`, {base: buildFolder})
        .pipe(rev())
        .pipe(revDel())
        .pipe(dest(buildFolder))
        .pipe(rev.manifest('rev.json'))
        .pipe(dest(buildFolder));
};

const rewrite = () => {
    const manifest = readFileSync('app/rev.json');
    src(`${buildFolder}/css/*.css`)
        .pipe(revRewrite({
            manifest
        }))
        .pipe(dest(`${buildFolder}/css`));
    return src(`${buildFolder}/**/*.html`)
        .pipe(revRewrite({
            manifest
        }))
        .pipe(dest(buildFolder));
};

const zipFiles = () => {
    del.sync([`${buildFolder}/*.zip`]);
    return src(`${buildFolder}/**/*.*`, {})
        .pipe(plumber(
            notify.onError({
            title: "ZIP",
            message: "Error: <%= error.message %>"
            })
        ))
        .pipe(zip(`${rootFolder}.zip`))
        .pipe(dest(buildFolder));
};

const toProduction = (done) => {
    production = true;
    done();
};

exports.default = series(clean, pugPages, styles, scripts, fonts, images, webpImages, avifImages, svgSprite, watchFiles);

exports.backend = series(clean, pugPages, scriptsBackend, stylesBackend, fonts, images, webpImages, avifImages, svgSprite)

exports.build = series(toProduction, clean, pugPages, styles, scripts, fonts, images, webpImages, avifImages);

exports.cache = series(cache, rewrite);

exports.archive = zipFiles;
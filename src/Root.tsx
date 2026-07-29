import {CalculateMetadataFunction, Composition} from 'remotion';
import story from './data/story.json';
import presentation from './data/presentation.json';
import carousel from './data/carousel.json';
import specialMontage from './data/special-montage.json';
import youtubeDoc from './data/youtube/isabel-pantoja-marinero-de-luces.json';
import {StoryVideo} from './StoryVideo';
import {StoryTeaser} from './StoryTeaser';
import {StoryCover} from './StoryCover';
import {PresentationVideo} from './PresentationVideo';
import {SpecialMontageVideo} from './SpecialMontageVideo';
import {YouTubeDocumentaryVideo} from './YouTubeDocumentaryVideo';
import {YouTubeThumbnail} from './YouTubeThumbnail';
import {SubstackBanner} from './SubstackBanner';
import {SubstackHeaderLogo} from './SubstackHeaderLogo';
import {SubstackSocialCover} from './SubstackSocialCover';
import {CarouselGrid} from './carousel/CarouselGrid';
import {
  Story10KGratitud,
  Story10KDescubrimiento,
  Story10KWebOficial,
  Story10KFuturo
} from './Stories10K';
import {StorySchema, CarouselSchema} from './types';

const defaultStory = StorySchema.parse(story);
const defaultCarousel = CarouselSchema.parse(carousel);
const fps = 30;

const calculateStoryMetadata: CalculateMetadataFunction<typeof defaultStory> = ({
  props
}) => {
  const parsedStory = StorySchema.parse(props);

  return {
    durationInFrames: parsedStory.durationSeconds * fps
  };
};

export const Root = () => {
  return (
    <>
      <Composition
        id="StoryVideo"
        component={StoryVideo}
        durationInFrames={defaultStory.durationSeconds * fps}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={defaultStory}
        calculateMetadata={calculateStoryMetadata}
      />
      <Composition
        id="StoryTeaser"
        component={StoryTeaser}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1920}
        defaultProps={defaultStory}
      />
      <Composition
        id="StoryCover"
        component={StoryCover}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1920}
        defaultProps={defaultStory}
      />
      <Composition
        id="PresentationVideo"
        component={PresentationVideo as any}
        durationInFrames={presentation.durationSeconds * fps}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={presentation}
      />
      <Composition
        id="CarouselGrid"
        component={CarouselGrid}
        durationInFrames={defaultCarousel.slides.length}
        fps={1}
        width={1080}
        height={1350}
        defaultProps={defaultCarousel}
      />
      <Composition
        id="SpecialMontageVideo"
        component={SpecialMontageVideo as any}
        durationInFrames={specialMontage.durationSeconds * fps}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={specialMontage as any}
      />
      <Composition
        id="SubstackBanner"
        component={SubstackBanner}
        durationInFrames={1}
        fps={1}
        width={1920}
        height={600}
      />
      <Composition
        id="SubstackHeaderLogo"
        component={SubstackHeaderLogo}
        durationInFrames={1}
        fps={1}
        width={1400}
        height={300}
      />
      <Composition
        id="SubstackSocialCover"
        component={SubstackSocialCover}
        durationInFrames={1}
        fps={1}
        width={1200}
        height={630}
      />
      <Composition
        id="Story10K-1-Gratitud"
        component={Story10KGratitud}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1920}
      />
      <Composition
        id="Story10K-2-Descubrimiento"
        component={Story10KDescubrimiento}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1920}
      />
      <Composition
        id="Story10K-3-WebOficial"
        component={Story10KWebOficial}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1920}
      />
      <Composition
        id="Story10K-4-Futuro"
        component={Story10KFuturo}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1920}
      />
      <Composition
        id="YouTubeDocumentary"
        component={YouTubeDocumentaryVideo as any}
        durationInFrames={youtubeDoc.durationSeconds * fps}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={youtubeDoc as any}
      />
      <Composition
        id="YouTubeThumbnail"
        component={YouTubeThumbnail as any}
        durationInFrames={1}
        fps={1}
        width={1280}
        height={720}
        defaultProps={{
          bgImage: 'videos/youtube/isabel-pantoja-marinero-de-luces/thumbnail_bg.jpg',
          category: 'Acordes Ocultos',
          badge: 'Historia Real',
          mainTitle: 'EL LLANTO QUE',
          accentTitle: 'PARALIZÓ A UN PAÍS',
          subtext: 'La tragedia de Paquirri y el réquiem secreto de Perales',
          palette: {
            paper: '#ffffff',
            accent: '#b91c1c',
            glow: '#f59e0b'
          }
        }}
      />
    </>
  );
};


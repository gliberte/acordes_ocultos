import {CalculateMetadataFunction, Composition} from 'remotion';
import story from './data/story.json';
import {StoryVideo} from './StoryVideo';
import {StorySchema} from './types';

const defaultStory = StorySchema.parse(story);
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
  );
};

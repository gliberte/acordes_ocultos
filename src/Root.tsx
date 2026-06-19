import {Composition} from 'remotion';
import story from './data/story.json';
import {StoryVideo} from './StoryVideo';
import {StorySchema} from './types';

const defaultStory = StorySchema.parse(story);

export const Root = () => {
  return (
    <Composition
      id="StoryVideo"
      component={StoryVideo}
      durationInFrames={60 * 30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultStory}
    />
  );
};

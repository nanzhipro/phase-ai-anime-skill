# frozen_string_literal: true

require 'json'
require 'minitest/autorun'
require 'yaml'

class ExampleSmokeTest < Minitest::Test
  ROOT = File.expand_path('..', __dir__)
  EXAMPLE = File.join(ROOT, 'examples', 'rainy-convenience-store')

  def test_example_has_traceable_storyboard_timeline_jobs_and_assembly
    storyboard = load_yaml('anime/storyboard/episode-001-shots.yaml')
    timeline = load_yaml('anime/audio/episode-001-timeline.yaml')
    jobs = load_json('anime/jobs/episode-001-generation-jobs.json')
    assembly = load_json('anime/assembly/episode-001-assembly.json')

    shot_ids = storyboard.fetch('shots').map { |shot| shot.fetch('shot_id') }
    timeline_shot_ids = timeline.fetch('timeline').map { |entry| entry.fetch('shot_id') }
    job_shot_ids = jobs.fetch('jobs').map { |job| job.fetch('input').fetch('shot_id') }.uniq
    assembly_shot_ids = assembly.fetch('clips').map { |clip| clip.fetch('shot_id') }

    assert_equal shot_ids, timeline_shot_ids
    assert (job_shot_ids - shot_ids).empty?, 'job shot ids must come from storyboard'
    assert_equal shot_ids, assembly_shot_ids

    assert_equal 60, storyboard.fetch('runtime_seconds')
    assert_equal 60, timeline.fetch('runtime_seconds')
    assert_equal 60, assembly.fetch('runtimeSeconds')

    jobs_by_kind_and_shot = jobs.fetch('jobs').group_by do |job|
      [job.fetch('kind'), job.fetch('input').fetch('shot_id')]
    end
    shot_ids.each do |shot_id|
      assert jobs_by_kind_and_shot.key?(['image', shot_id]), "missing image job for #{shot_id}"
      assert jobs_by_kind_and_shot.key?(['video', shot_id]), "missing video job for #{shot_id}"
      assert jobs_by_kind_and_shot.key?(['audio_mix', shot_id]), "missing audio mix job for #{shot_id}"
    end

    dialogue_cues = timeline.fetch('timeline').flat_map do |entry|
      entry.fetch('cues')
           .select { |cue| cue.fetch('kind') == 'dialogue' }
           .map { |cue| cue.fetch('cue_id') }
    end
    tts_cues = jobs.fetch('jobs')
                  .select { |job| job.fetch('kind') == 'tts' }
                  .map { |job| job.fetch('input').fetch('cue_id') }
    assert_equal dialogue_cues, tts_cues
  end

  def test_generation_jobs_are_provider_neutral_and_secret_free
    jobs = load_json('anime/jobs/episode-001-generation-jobs.json')
    forbidden_keys = %w[api_key apiKey token cookie secret]

    jobs.fetch('jobs').each do |job|
      assert_equal 'unassigned', job.fetch('provider')
      forbidden_hits = flatten_keys(job) & forbidden_keys
      assert_empty forbidden_hits, "forbidden fields found: #{forbidden_hits.join(', ')}"
    end
  end

  def test_agent_map_tracks_phase_node_adapter_responsibilities
    agent_map = load_yaml('anime/agents/episode-001-agent-map.yaml')
    storyboard = load_yaml('anime/storyboard/episode-001-shots.yaml')
    timeline = load_yaml('anime/audio/episode-001-timeline.yaml')
    jobs = load_json('anime/jobs/episode-001-generation-jobs.json')

    agents = agent_map.fetch('agents')
    roles = agents.map { |agent| agent.fetch('role') }
    shot_ids = storyboard.fetch('shots').map { |shot| shot.fetch('shot_id') }
    storyboard_cue_ids = storyboard.fetch('shots').flat_map { |shot| shot.fetch('audio_cues') }
    timeline_shot_ids = timeline.fetch('timeline').map { |entry| entry.fetch('shot_id') }
    timeline_cue_ids = timeline.fetch('timeline').flat_map do |entry|
      entry.fetch('cues').map { |cue| cue.fetch('cue_id') }
    end
    job_ids = jobs.fetch('jobs').map { |job| job.fetch('jobId') }

    assert_includes roles, 'phase'
    assert_includes roles, 'node'
    assert_includes roles, 'adapter'

    shot_agent = find_agent(agents, 'shot-storyboard-agent')
    assert_equal shot_ids, shot_agent.fetch('traceability').fetch('shot_ids')
    assert_equal storyboard_cue_ids, shot_agent.fetch('traceability').fetch('audio_cue_ids')

    audio_agent = find_agent(agents, 'audio-timeline-agent')
    assert_equal timeline_shot_ids, audio_agent.fetch('traceability').fetch('shot_ids')
    assert_equal timeline_cue_ids, audio_agent.fetch('traceability').fetch('audio_cue_ids')

    jobs_agent = find_agent(agents, 'generation-job-specs-agent')
    assert_empty jobs_agent.fetch('traceability').fetch('shot_ids') - shot_ids
    assert_equal job_ids, jobs_agent.fetch('traceability').fetch('job_ids')

    assembly_agent = find_agent(agents, 'assembly-qc-agent')
    assert_equal shot_ids, assembly_agent.fetch('traceability').fetch('shot_ids')

    adapter_agent = find_agent(agents, 'image-generation-adapter-agent')
    assert_equal 'image_generation_adapter', adapter_agent.fetch('adapter_slot')
  end

  def test_example_documentation_exists
    %w[
      README.md
      plan/manifest.yaml
      plan/common.md
      anime/bible/concept.md
      anime/scripts/episode-001-dialogue.md
      anime/storyboard/episode-001-shots.yaml
      anime/audio/episode-001-timeline.yaml
      anime/prompts/episode-001-image-prompts.yaml
      anime/prompts/episode-001-video-prompts.yaml
      anime/agents/episode-001-agent-map.yaml
      anime/jobs/episode-001-generation-jobs.json
      anime/assembly/episode-001-assembly.json
      anime/review/episode-001-qc.md
    ].each do |relative_path|
      assert File.file?(File.join(EXAMPLE, relative_path)), "missing #{relative_path}"
    end
  end

  private

  def load_yaml(relative_path)
    YAML.safe_load(File.read(File.join(EXAMPLE, relative_path)))
  end

  def load_json(relative_path)
    JSON.parse(File.read(File.join(EXAMPLE, relative_path)))
  end

  def flatten_keys(value)
    case value
    when Hash
      value.keys + value.values.flat_map { |entry| flatten_keys(entry) }
    when Array
      value.flat_map { |entry| flatten_keys(entry) }
    else
      []
    end
  end

  def find_agent(agents, agent_id)
    agents.find { |agent| agent.fetch('id') == agent_id } || flunk("missing agent #{agent_id}")
  end
end

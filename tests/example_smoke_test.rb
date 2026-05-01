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

  def test_example_documentation_exists
    %w[
      README.md
      plan/manifest.yaml
      plan/common.md
      anime/bible/concept.md
      anime/storyboard/episode-001-shots.yaml
      anime/audio/episode-001-timeline.yaml
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
end

# frozen_string_literal: true

require 'fileutils'
require 'minitest/autorun'
require 'open3'
require 'tmpdir'
require 'yaml'

class PlanctlAutonomousTest < Minitest::Test
  REPO_ROOT = File.expand_path('..', __dir__)
  SOURCE_PLANCTL = File.join(REPO_ROOT, 'scripts', 'planctl.rb')

  def setup
    @tmpdir = Dir.mktmpdir('phase-contract-autonomous-')
    @repo = @tmpdir
    FileUtils.mkdir_p(File.join(@repo, 'scripts'))
    FileUtils.cp(SOURCE_PLANCTL, File.join(@repo, 'scripts', 'planctl'))
    FileUtils.chmod('+x', File.join(@repo, 'scripts', 'planctl'))
    create_plan_files
    git('init')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'Planctl Test')
    git('add', '-A')
    git('commit', '-m', 'baseline')
  end

  def teardown
    FileUtils.remove_entry(@tmpdir) if @tmpdir && File.exist?(@tmpdir)
  end

  def test_complete_continue_prints_next_phase_action
    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_COMMIT' => '1' },
      'complete', 'phase-0',
      '--summary', 'Scaffold complete.',
      '--next-focus', 'Implement phase 1.',
      '--continue'
    )

    assert status.success?, err
    assert_includes out, 'Marked complete: phase-0'
    assert_includes out, '=== Phase-AI-Anime Advance ==='
    assert_includes out, 'ACTION: implement'
    assert_includes out, 'PHASE: phase-1'
    refute_includes out, 'asking for an extra confirmation'
  end

  def test_status_lists_available_phase_ids
    out, err, status = run_planctl('status')

    assert status.success?, err
    assert_includes out, 'Phase-AI-Anime plan state'
    assert_includes out, 'Available phases:'
    assert_includes out, '- phase-0: Scaffold'
  end

  def test_advance_strict_treats_placeholder_as_internal_action_not_blocker
    File.write(File.join(@repo, 'plan/state.yaml'), <<~YAML)
      version: 1
      completed_phases:
        - phase-0
      completion_log: []
    YAML
    File.write(
      File.join(@repo, 'plan/phases/phase-1.md'),
      "# PHASE_CONTRACT_PLACEHOLDER\n\n占位合同，禁止实施。"
    )

    out, err, status = run_planctl('advance', '--strict')

    assert status.success?, err
    assert_includes out, 'ACTION: promote_placeholder'
    assert_includes out, 'PHASE: phase-1'
    assert_includes out, 'STOP_REASON: none'
  end

  def test_resume_strict_uses_advance_actions_for_placeholder_phase
    File.write(File.join(@repo, 'plan/state.yaml'), <<~YAML)
      version: 1
      completed_phases:
        - phase-0
      completion_log: []
    YAML
    File.write(
      File.join(@repo, 'plan/execution/phase-1.md'),
      "# PHASE_CONTRACT_PLACEHOLDER\n\n占位合同，禁止实施。"
    )

    out, err, status = run_planctl('resume', '--strict')

    assert status.success?, err
    assert_includes out, '--- Next action ---'
    assert_includes out, 'ACTION: promote_placeholder'
  end

  def test_finalize_first_run_records_ledger_and_creates_commit
    complete_all_phases_with_skip_commit

    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_PUSH' => '1' },
      'finalize'
    )

    assert status.success?, err
    state = YAML.load_file(File.join(@repo, 'plan/state.yaml'))
    refute_nil state['finalized_at']
    refute_empty state['finalized_at']
    assert_equal state['finalized_at'], state['updated_at']
    handoff = File.read(File.join(@repo, 'plan/handoff.md'))
    assert_includes handoff, "Finalized at: `#{state['finalized_at']}`"
    assert_includes out, 'Finalized at:'
    assert_includes out, 'chore(plan): finalize test-project execution'

    log = git_output('log', '-n', '1', '--format=%s%n%b')
    assert_includes log, 'chore(plan): finalize test-project execution'
    assert_includes log, 'Finalized-At:'
    assert_includes log, 'Automated-By: scripts/planctl finalize'
  end

  def test_finalize_second_run_is_read_only_after_finalized_at_exists
    complete_all_phases_with_skip_commit
    run_planctl({ 'PHASE_CONTRACT_SKIP_PUSH' => '1' }, 'finalize')
    baseline_state = YAML.load_file(File.join(@repo, 'plan/state.yaml'))
    baseline_handoff = File.read(File.join(@repo, 'plan/handoff.md'))
    baseline_head = git_output('rev-parse', 'HEAD').strip

    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_PUSH' => '1' },
      'finalize'
    )

    assert status.success?, err
    assert_equal baseline_state, YAML.load_file(File.join(@repo, 'plan/state.yaml'))
    assert_equal baseline_handoff, File.read(File.join(@repo, 'plan/handoff.md'))
    assert_equal baseline_head, git_output('rev-parse', 'HEAD').strip
    assert_includes out, 'Finalized at:'
    refute_includes out, 'Committed finalization ledger'
  end

  def test_reset_clears_phase_state_and_returns_to_phase_0
    complete_all_phases_with_skip_commit
    run_planctl({ 'PHASE_CONTRACT_SKIP_PUSH' => '1' }, 'finalize')

    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_PUSH' => '1' },
      'reset',
      '--summary', 'Start over from the first phase.'
    )

    assert status.success?, err
    assert_includes out, 'Reset phase flow to phase-0 (Scaffold).'
    assert_includes out, 'NEXT_COMMAND: ruby scripts/planctl advance --strict'

    state = YAML.load_file(File.join(@repo, 'plan/state.yaml'))
    assert_empty state['completed_phases']
    assert_empty state['completion_log']
    assert_nil state['finalized_at']
    assert_equal 'phase-0', state['reset_history'].last['reset_to_phase_id']
    assert_equal 'Start over from the first phase.', state['reset_history'].last['summary']

    handoff = File.read(File.join(@repo, 'plan/handoff.md'))
    assert_includes handoff, 'Completed phases: `none`'
    refute_includes handoff, 'Finalized at:'

    advance_out, advance_err, advance_status = run_planctl('advance', '--strict')
    assert advance_status.success?, advance_err
    assert_includes advance_out, 'ACTION: implement'
    assert_includes advance_out, 'PHASE: phase-0 Scaffold'

    log = git_output('log', '-n', '1', '--format=%s%n%b')
    assert_includes log, 'chore(plan): reset workflow to phase-0'
    assert_includes log, 'Reset-To-Phase: phase-0'
    assert_includes log, 'Automated-By: scripts/planctl reset'
  end

  def test_source_file_reports_rb_command_when_invoked_directly
    FileUtils.cp(SOURCE_PLANCTL, File.join(@repo, 'scripts', 'planctl.rb'))

    out, err, status = Open3.capture3(
      { 'PHASE_CONTRACT_SKIP_COMMIT' => '1' },
      'ruby', 'scripts/planctl.rb',
      'complete', 'phase-0',
      '--summary', 'Scaffold complete.',
      '--next-focus', 'Implement phase 1.',
      chdir: @repo
    )

    assert status.success?, err
    assert_includes out, 'Run: ruby scripts/planctl.rb advance --strict'
  end

  def test_complete_rejects_failing_artifact_gate
    FileUtils.mkdir_p(File.join(@repo, 'story/draft'))
    File.write(File.join(@repo, 'story/draft/chapter-1.md'), "## One\nshort\n")
    update_manifest do |manifest|
      manifest['phases'][0]['artifact_checks'] = [
        {
          'type' => 'min_chars',
          'path' => 'story/draft/chapter-1.md',
          'min' => 100
        }
      ]
    end

    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_COMMIT' => '1' },
      'complete', 'phase-0',
      '--summary', 'Too short.',
      '--next-focus', 'Try again.'
    )

    refute status.success?
    assert_includes err, 'artifact checks failed'
    state = YAML.load_file(File.join(@repo, 'plan/state.yaml'))
    assert_empty state['completed_phases']
    assert_empty state['completion_log']
  end

  def test_complete_rejects_missing_required_artifact_gate_for_full_draft_phase
    FileUtils.mkdir_p(File.join(@repo, 'story/draft'))
    File.write(File.join(@repo, 'story/draft/chapter-1.md'), "## One\n" + ('a' * 120))
    update_manifest do |manifest|
      manifest['project_profile'] = {
        'form' => 'longform-novel',
        'delivery_tier' => 'full-draft',
        'delivery_paths' => ['story/draft/**/*.md'],
        'target_length_chars' => { 'min' => 100 },
        'target_chapters' => { 'min' => 1 },
        'target_chapter_pattern' => '^## '
      }
      manifest['phases'][0]['allowed_paths'] = ['story/draft/**']
      manifest['phases'][0].delete('artifact_checks')
    end

    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_COMMIT' => '1' },
      'complete', 'phase-0',
      '--summary', 'No machine gate.',
      '--next-focus', 'Add artifact checks.'
    )

    refute status.success?
    assert_includes err, 'requires artifact_checks because project_profile.delivery_tier="full-draft"'
    refute_includes out, 'Marked complete: phase-0'
    state = YAML.load_file(File.join(@repo, 'plan/state.yaml'))
    assert_empty state['completed_phases']
  end

  def test_complete_records_artifact_evidence_when_checks_pass
    FileUtils.mkdir_p(File.join(@repo, 'story/draft'))
    File.write(File.join(@repo, 'story/draft/chapter-1.md'), "## One\n" + ('a' * 120))
    update_manifest do |manifest|
      manifest['phases'][0]['artifact_checks'] = [
        {
          'type' => 'file_exists',
          'path' => 'story/draft/chapter-1.md'
        },
        {
          'type' => 'min_chars',
          'path' => 'story/draft/chapter-1.md',
          'min' => 50
        },
        {
          'type' => 'regex_count',
          'path' => 'story/draft/chapter-1.md',
          'pattern' => '^## ',
          'min' => 1
        }
      ]
    end

    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_COMMIT' => '1' },
      'complete', 'phase-0',
      '--summary', 'Artifact checks passed.',
      '--next-focus', 'Continue.'
    )

    assert status.success?, err
    assert_includes out, 'Marked complete: phase-0'
    state = YAML.load_file(File.join(@repo, 'plan/state.yaml'))
    evidence = state['completion_log'].first['evidence']
    assert_equal 3, evidence['artifact_checks'].length
    assert_equal 3, evidence['artifact_checks'].count { |check| check['passed'] }
    assert_equal ['story/draft/chapter-1.md'], evidence['file_snapshots'].map { |snapshot| snapshot['path'] }
  end

  def test_advance_rejects_embedded_project_when_repo_policy_requires_standalone
    nested_repo = File.join(@repo, 'nested-project')
    create_project_files(nested_repo, repo_policy: { 'mode' => 'standalone' })

    out, err, status = Open3.capture3('ruby', 'scripts/planctl', 'advance', '--strict', chdir: nested_repo)

    refute status.success?
    assert_equal 3, status.exitstatus
    assert_includes err, 'repo_policy.mode=standalone requires the project root to be the git top-level'
    refute_includes out, 'ACTION: implement'
  end

  def test_finalize_reports_delivery_gate_failure_when_project_target_is_not_met
    FileUtils.mkdir_p(File.join(@repo, 'story/draft'))
    File.write(File.join(@repo, 'story/draft/chapter-1.md'), "## One\nsmall\n")
    update_manifest do |manifest|
      manifest['project_profile'] = {
        'form' => 'longform-novel',
        'delivery_tier' => 'full-draft',
        'delivery_paths' => ['story/draft/**/*.md'],
        'target_length_chars' => { 'min' => 500 },
        'target_chapters' => { 'min' => 2 },
        'target_chapter_pattern' => '^## '
      }
    end

    complete_all_phases_with_skip_commit

    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_PUSH' => '1' },
      'finalize'
    )

    assert status.success?, err
    assert_includes out, '--- Delivery gate ---'
    assert_includes out, 'Gate status: fail'
    assert_includes out, 'below target minimum 500'
    assert_includes out, 'current unit count 1 is below target minimum 2'
  end

  def test_doctor_reports_missing_required_artifact_gate_phase
    update_manifest do |manifest|
      manifest['project_profile'] = {
        'form' => 'longform-novel',
        'delivery_tier' => 'full-draft',
        'delivery_paths' => ['story/draft/**/*.md'],
        'target_length_chars' => { 'min' => 100 },
        'target_chapters' => { 'min' => 1 },
        'target_chapter_pattern' => '^## '
      }
      manifest['phases'][0]['allowed_paths'] = ['story/draft/**']
      manifest['phases'][0].delete('artifact_checks')
    end

    out, err, status = run_planctl('doctor')

    refute status.success?
    assert_includes out, 'Problems:'
    assert_includes out, 'delivery tier full-draft requires artifact_checks for delivery-bearing phases'
  end

  def test_doctor_warns_for_legacy_draft_manifest_missing_profile_and_repo_policy
    update_manifest do |manifest|
      manifest['phases'][0]['allowed_paths'] = ['story/draft/**']
      manifest.delete('project_profile')
      manifest.delete('repo_policy')
    end

    out, err, status = run_planctl('doctor')

    assert status.success?, err
    assert_includes out, 'Warnings:'
    assert_includes out, 'legacy story manifest is missing repo_policy'
    assert_includes out, 'legacy delivery-bearing manifest is missing project_profile'
  end

  def test_doctor_reports_missing_required_project_profile_fields_for_full_draft
    update_manifest do |manifest|
      manifest['project_profile'] = {
        'form' => 'longform-novel',
        'delivery_tier' => 'full-draft'
      }
      manifest['phases'][0]['allowed_paths'] = ['story/draft/**']
    end

    out, err, status = run_planctl('doctor')

    refute status.success?
    assert_includes out, 'Problems:'
    assert_includes out, 'delivery tier full-draft requires project_profile fields'
    assert_includes out, 'delivery_paths'
    assert_includes out, 'target_length_chars'
    assert_includes out, 'target_chapters'
    assert_includes out, 'target_chapter_pattern'
  end

  def test_doctor_reports_incomplete_project_profile_ranges_for_full_draft
    update_manifest do |manifest|
      manifest['project_profile'] = {
        'form' => 'longform-novel',
        'delivery_tier' => 'full-draft',
        'delivery_paths' => ['story/draft/**/*.md'],
        'target_length_chars' => { 'min' => 1000 },
        'target_chapters' => { 'max' => 12 },
        'target_chapter_pattern' => ''
      }
      manifest['phases'][0]['allowed_paths'] = ['story/draft/**']
    end

    out, err, status = run_planctl('doctor')

    refute status.success?
    assert_includes out, 'project_profile.target_length_chars must declare both min and max'
    assert_includes out, 'project_profile.target_chapters must declare both min and max'
    assert_includes out, 'delivery tier full-draft requires project_profile fields'
    assert_includes out, 'target_chapter_pattern'
  end

  def test_doctor_reports_non_positive_project_profile_ranges_for_full_draft
    update_manifest do |manifest|
      manifest['project_profile'] = {
        'form' => 'longform-novel',
        'delivery_tier' => 'full-draft',
        'delivery_paths' => ['story/draft/**/*.md'],
        'target_length_chars' => { 'min' => 0, 'max' => 2000 },
        'target_chapters' => { 'min' => -1, 'max' => 10 },
        'target_chapter_pattern' => '^## '
      }
      manifest['phases'][0]['allowed_paths'] = ['story/draft/**']
    end

    out, err, status = run_planctl('doctor')

    refute status.success?
    assert_includes out, 'project_profile.target_length_chars.min must be a positive integer'
    assert_includes out, 'project_profile.target_chapters.min must be a positive integer'
  end

  private

  def create_plan_files
    create_project_files(@repo)
  end

  def create_project_files(repo, repo_policy: nil)
    FileUtils.mkdir_p(File.join(repo, 'scripts'))
    FileUtils.cp(SOURCE_PLANCTL, File.join(repo, 'scripts', 'planctl'))
    FileUtils.chmod('+x', File.join(repo, 'scripts', 'planctl'))
    FileUtils.mkdir_p(File.join(repo, 'plan/phases'))
    FileUtils.mkdir_p(File.join(repo, 'plan/execution'))
    File.write(File.join(repo, 'plan/common.md'), "# Common\n")
    File.write(File.join(repo, 'plan/handoff.md'), "# Handoff\n")
    File.write(File.join(repo, 'plan/phases/phase-0.md'), "# Phase 0\n")
    File.write(File.join(repo, 'plan/execution/phase-0.md'), "# Execution 0\n")
    File.write(File.join(repo, 'plan/phases/phase-1.md'), "# Phase 1\n")
    File.write(File.join(repo, 'plan/execution/phase-1.md'), "# Execution 1\n")

    manifest = YAML.safe_load(<<~YAML)
      version: 1
      project: test-project
      execution_rule:
        resolver: scripts/planctl
        state_file: plan/state.yaml
        handoff_file: plan/handoff.md
        required_context:
          - plan/common.md
        continuation:
          mode: autonomous
          stop_only_on:
            - blocker
            - dependency_missing
            - missing_context
            - all_phases_completed
        compression_control:
          max_completion_history: 3
          resume_read_order:
            - plan/manifest.yaml
            - plan/handoff.md
            - next.phase.required_context
          rules:
            - Never load all phase docs.
        continuous_execution:
          next_command: ruby scripts/planctl advance --strict
          completion_command: ruby scripts/planctl complete <phase-id> --summary "<summary>" --next-focus "<next-focus>" --continue
      phases:
        - id: phase-0
          title: Scaffold
          plan_file: plan/phases/phase-0.md
          execution_file: plan/execution/phase-0.md
          depends_on: []
        - id: phase-1
          title: Implement
          plan_file: plan/phases/phase-1.md
          execution_file: plan/execution/phase-1.md
          depends_on:
            - phase-0
    YAML
    manifest['repo_policy'] = repo_policy if repo_policy
    File.write(File.join(repo, 'plan/manifest.yaml'), YAML.dump(manifest))
    File.write(File.join(repo, 'plan/state.yaml'), <<~YAML)
      version: 1
      completed_phases: []
      completion_log: []
    YAML
  end

  def update_manifest
    manifest_path = File.join(@repo, 'plan/manifest.yaml')
    manifest = YAML.load_file(manifest_path)
    yield manifest
    File.write(manifest_path, YAML.dump(manifest))
  end

  def run_planctl(*args)
    env = args.first.is_a?(Hash) ? args.shift : {}
    Open3.capture3(env, 'ruby', 'scripts/planctl', *args, chdir: @repo)
  end

  def complete_all_phases_with_skip_commit
    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_COMMIT' => '1' },
      'complete', 'phase-0',
      '--summary', 'Phase 0 done.',
      '--next-focus', 'Start phase 1.'
    )
    raise "phase-0 complete failed: #{err}\n#{out}" unless status.success?

    out, err, status = run_planctl(
      { 'PHASE_CONTRACT_SKIP_COMMIT' => '1' },
      'complete', 'phase-1',
      '--summary', 'Phase 1 done.',
      '--next-focus', 'Finalize execution.'
    )
    raise "phase-1 complete failed: #{err}\n#{out}" unless status.success?
  end

  def git_output(*args)
    out, err, status = Open3.capture3('git', *args, chdir: @repo)
    raise err unless status.success?

    out
  end

  def git(*args)
    Open3.capture3('git', *args, chdir: @repo).tap do |_out, err, status|
      raise err unless status.success?
    end
  end
end

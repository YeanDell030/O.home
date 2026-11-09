'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { newId, useLocalList } from '@/lib/postStore';
import {
  KInput,
  KSelect,
  KTextarea,
} from '@/components/ui/Kit';
import {
  EditableDesc,
  PageTitle,
} from '@/components/ui/PageText';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type CourseType = 'course' | 'workshop' | 'lecture';

interface CourseItem {
  id: string;
  period: string;
  institution: string;
  title: string;
  type: CourseType;
  programs: string;
  description: string;
  url?: string;
  visibility?: 'public';
}

type CourseDraft = Omit<CourseItem, 'id' | 'visibility'>;

/*
 * 기존 게시글을 그대로 불러오기 위해
 * 이 값은 변경하지 않습니다.
 */
const COURSE_KEY = 'ohome.commapply.v1';

const EMPTY: CourseDraft = {
  period: '',
  institution: '',
  title: '',
  type: 'course',
  programs: '',
  description: '',
  url: '',
};

/*
 * 위 목록에 등록되지 않은 새로운 학교에
 * 자동으로 적용되는 기본 색상입니다.
 */
const DEFAULT_INSTITUTION_STYLE: React.CSSProperties = {
  background: '#f1f3f5',
  border: '1px solid #ced4da',
  color: '#495057',
};

function getInstitutionStyle(
  institution: string
): React.CSSProperties {
  return (
    INSTITUTION_STYLE[institution.trim()] ??
    DEFAULT_INSTITUTION_STYLE
  );
}

export default function CoursesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const del = useConfirmDelete();

  const [courses, setCourses, loaded] =
    useLocalList<CourseItem>(COURSE_KEY, []);

  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] =
    useState<CourseDraft>(EMPTY);

  const openAdd = () => {
    if (!isAdmin) {
      toast('관리자만 강의를 추가할 수 있습니다');
      return;
    }

    setEditId(null);
    setDraft(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (course: CourseItem) => {
    if (!isAdmin) {
      toast('관리자만 강의 정보를 편집할 수 있습니다');
      return;
    }

    setEditId(course.id);

    setDraft({
      period: course.period ?? '',
      institution: course.institution ?? '',
      title: course.title ?? '',
      type: course.type ?? 'course',
      programs: course.programs ?? '',
      description: course.description ?? '',
      url: course.url ?? '',
    });

    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setDraft(EMPTY);
  };

  const save = () => {
    if (!isAdmin) {
      toast('관리자만 강의 정보를 편집할 수 있습니다');
      return;
    }

    if (!draft.title.trim()) {
      toast('강의명을 입력해 주세요');
      return;
    }

    if (!draft.institution.trim()) {
      toast('학교 또는 기관명을 입력해 주세요');
      return;
    }

    const item: CourseItem = {
      id: editId ?? newId(),
      period: draft.period.trim(),
      institution: draft.institution.trim(),
      title: draft.title.trim(),
      type: draft.type,
      programs: draft.programs.trim(),
      description: draft.description.trim(),
      url: draft.url?.trim() || undefined,
      visibility: 'public',
    };

    if (editId) {
      setCourses(
        courses.map(course =>
          course.id === editId ? item : course
        )
      );
    } else {
      setCourses([item, ...courses]);
    }

    toast(
      editId
        ? '강의 정보가 수정되었습니다'
        : '강의가 추가되었습니다'
    );

    closeForm();
  };

  const remove = (course: CourseItem) => {
    if (!isAdmin) {
      toast('관리자만 강의 정보를 삭제할 수 있습니다');
      return;
    }

    del.ask(
      `「${course.title}」 강의를 삭제하시겠습니까?`,
      () =>
        setCourses(
          courses.filter(item => item.id !== course.id)
        ),
      '삭제한 강의 정보는 되돌릴 수 없습니다.'
    );
  };

  /*
   * 게시글 순서 변경 함수
   *
   * up: 한 칸 위로 이동
   * down: 한 칸 아래로 이동
   *
   * setCourses가 실행되면 useLocalList가 변경된 배열을
   * 기존 저장소에 자동으로 저장합니다.
   */
  const moveCourse = (
    courseId: string,
    direction: 'up' | 'down'
  ) => {
    if (!isAdmin) {
      toast('관리자만 게시글 순서를 변경할 수 있습니다');
      return;
    }

    const currentIndex = courses.findIndex(
      course => course.id === courseId
    );

    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === 'up'
        ? currentIndex - 1
        : currentIndex + 1;

    /*
     * 첫 게시글보다 위 또는 마지막 게시글보다 아래로
     * 이동하지 못하도록 방지합니다.
     */
    if (
      targetIndex < 0 ||
      targetIndex >= courses.length
    ) {
      return;
    }

    const reorderedCourses = [...courses];

    [
      reorderedCourses[currentIndex],
      reorderedCourses[targetIndex],
    ] = [
      reorderedCourses[targetIndex],
      reorderedCourses[currentIndex],
    ];

    /*
     * 변경된 순서를 화면과 저장소에 동시에 반영합니다.
     */
    setCourses(reorderedCourses);

    toast(
      direction === 'up'
        ? '게시글을 위로 이동했습니다'
        : '게시글을 아래로 이동했습니다'
    );
  };

  const normalizedQuery = query.trim().toLowerCase();

  const shown = courses.filter(course => {
    if (!normalizedQuery) {
      return true;
    }

    return [
      course.period,
      course.institution,
      course.title,
      course.programs,
      TYPE_LABEL[course.type ?? 'course'],
    ]
      .filter(Boolean)
      .some(value =>
        value.toLowerCase().includes(normalizedQuery)
      );
  });

  if (!loaded) {
    return <section className="page" />;
  }

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>COURSES</PageTitle>

        <EditableDesc
          k="courses-desc"
          def="Courses and workshops in game engines, XR, digital art, and creative technology."
        />

        <div className="head-actions">
          <KInput
            value={query}
            placeholder="강의·학교·프로그램 검색"
            onChange={event =>
              setQuery(event.target.value)
            }
            style={{ width: 230 }}
          />

          {isAdmin && (
            <button
              className="btn btn-dark"
              onClick={openAdd}
            >
              ＋ ADD COURSE
            </button>
          )}
        </div>
      </div>

      {formOpen && isAdmin && (
        <div
          className="panel"
          style={{
            maxWidth: 760,
            margin: '0 auto 22px',
            padding: 26,
            display: 'grid',
            gap: 14,
          }}
        >
          <h3 style={{ margin: 0 }}>
            {editId ? 'EDIT COURSE' : 'ADD COURSE'}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div>
              <label className="k-label">
                Period
              </label>

              <KInput
                value={draft.period}
                placeholder="예: 2026 Spring"
                onChange={event =>
                  setDraft({
                    ...draft,
                    period: event.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="k-label">
                Type
              </label>

              <KSelect
                value={draft.type}
                onChange={value =>
                  setDraft({
                    ...draft,
                    type: value as CourseType,
                  })
                }
                options={[
                  {
                    value: 'course',
                    label: 'Course',
                  },
                  {
                    value: 'workshop',
                    label: 'Workshop',
                  },
                  {
                    value: 'lecture',
                    label: 'Special Lecture',
                  },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="k-label">
              Institution
            </label>

            <KInput
              value={draft.institution}
              placeholder="예: Korea National University of Arts"
              onChange={event =>
                setDraft({
                  ...draft,
                  institution: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="k-label">
              Course Title
            </label>

            <KInput
              value={draft.title}
              placeholder="예: AI & Art"
              onChange={event =>
                setDraft({
                  ...draft,
                  title: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="k-label">
              Programs / Tools
            </label>

            <KInput
              value={draft.programs}
              placeholder="예: Unity · Unreal Engine · Open Brush"
              onChange={event =>
                setDraft({
                  ...draft,
                  programs: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="k-label">
              Description
            </label>

            <KTextarea
              value={draft.description}
              placeholder="강의 내용과 교육 목표를 간단히 입력하세요"
              onChange={event =>
                setDraft({
                  ...draft,
                  description: event.target.value,
                })
              }
              style={{ minHeight: 110 }}
            />
          </div>

          <div>
            <label className="k-label">
              Related Link
            </label>

            <KInput
              value={draft.url ?? ''}
              placeholder="강의자료 또는 관련 페이지 주소"
              onChange={event =>
                setDraft({
                  ...draft,
                  url: event.target.value,
                })
              }
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={closeForm}
            >
              CANCEL
            </button>

            <button
              className="btn btn-dark"
              onClick={save}
            >
              SAVE
            </button>
          </div>
        </div>
      )}

      <div
        className="panel"
        style={{
          padding: '8px 18px',
          display: 'grid',
          gap: 0,
        }}
      >
        {shown.map(course => {
          /*
           * 검색 결과가 표시되고 있더라도 실제 전체 목록에서
           * 현재 게시글의 위치를 찾습니다.
           */
          const courseIndex = courses.findIndex(
            item => item.id === course.id
          );

          const isFirst = courseIndex === 0;

          const isLast =
            courseIndex === courses.length - 1;

          return (
            <div
              key={course.id}
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '130px 150px minmax(220px, 1fr) 220px auto',
                gap: 18,
                alignItems: 'center',
                padding: '18px 4px',
                borderBottom:
                  '1px solid var(--line)',
              }}
            >
              <div>
                <small
                  style={{
                    display: 'block',
                    color: 'var(--faint)',
                    letterSpacing: '.08em',
                  }}
                >
                  PERIOD
                </small>

                <b>{course.period || '—'}</b>
              </div>

              <div>
                <span
                  style={{
                    ...TYPE_STYLE[
                      course.type ?? 'course'
                    ],
                    display: 'inline-flex',
                    padding: '5px 11px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {
                    TYPE_LABEL[
                      course.type ?? 'course'
                    ]
                  }
                </span>
              </div>

              <div>
                <b
                  style={{
                    display: 'block',
                    fontSize: 15,
                  }}
                >
                  {course.title}
                </b>

                <span
                  style={{
                    ...getInstitutionStyle(
                      course.institution
                    ),
                    display: 'inline-flex',
                    marginTop: 6,
                    padding: '4px 9px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {course.institution}
                </span>

                {course.description && (
                  <p
                    style={{
                      margin: '7px 0 0',
                      color: 'var(--faint)',
                      fontSize: 12,
                    }}
                  >
                    {course.description}
                  </p>
                )}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--sub)',
                }}
              >
                {course.programs || '—'}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 7,
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
                {course.url && (
                  <a
                    className="btn btn-ghost"
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '5px 9px',
                      fontSize: 10,
                    }}
                  >
                    LINK ↗
                  </a>
                )}

                {isAdmin && (
                  <>
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        moveCourse(course.id, 'up')
                      }
                      disabled={isFirst}
                      title={
                        isFirst
                          ? '첫 번째 게시글입니다'
                          : '위로 이동'
                      }
                      style={{
                        padding: '5px 9px',
                        fontSize: 10,
                        opacity: isFirst ? 0.35 : 1,
                        cursor: isFirst
                          ? 'not-allowed'
                          : 'pointer',
                      }}
                    >
                      ↑
                    </button>

                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        moveCourse(course.id, 'down')
                      }
                      disabled={isLast}
                      title={
                        isLast
                          ? '마지막 게시글입니다'
                          : '아래로 이동'
                      }
                      style={{
                        padding: '5px 9px',
                        fontSize: 10,
                        opacity: isLast ? 0.35 : 1,
                        cursor: isLast
                          ? 'not-allowed'
                          : 'pointer',
                      }}
                    >
                      ↓
                    </button>

                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: '5px 9px',
                        fontSize: 10,
                      }}
                      onClick={() =>
                        openEdit(course)
                      }
                    >
                      EDIT
                    </button>

                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: '5px 9px',
                        fontSize: 10,
                      }}
                      onClick={() =>
                        remove(course)
                      }
                    >
                      DELETE
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {shown.length === 0 && (
          <p
            className="hint"
            style={{
              padding: 38,
              textAlign: 'center',
            }}
          >
            등록된 강의가 없습니다.
          </p>
        )}
      </div>

      {del.element}
    </section>
  );
}
